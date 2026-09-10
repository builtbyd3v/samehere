import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { GITHUB_CREDENTIALS_KEY_ENV } from "./config";

const NONCE_BYTES = 12;
const KEY_BYTES = 32;

export function parseCredentialsKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error(`${GITHUB_CREDENTIALS_KEY_ENV} is missing.`);
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === KEY_BYTES) return decoded;
  } catch {
    // fall through
  }
  throw new Error(`${GITHUB_CREDENTIALS_KEY_ENV} must be 32 bytes as hex or base64.`);
}

export function createPkcePair(): { verifier: string; challenge: string; method: "S256" } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, method: "S256" };
}

export function encryptSecret(input: {
  key: Buffer;
  keyVersion: number;
  plaintext: string;
  aad: string;
}): string {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", input.key, nonce);
  cipher.setAAD(Buffer.from(input.aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${input.keyVersion}.${nonce.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(input: { key: Buffer; packed: string; aad: string }): string {
  const parts = input.packed.split(".");
  if (parts.length !== 4 || !parts[0].startsWith("v")) {
    throw new Error("Invalid credential payload.");
  }
  const version = Number.parseInt(parts[0].slice(1), 10);
  if (!Number.isInteger(version) || version < 1 || !input.aad.includes(`v${version}`)) {
    throw new Error("Invalid credential version.");
  }
  const nonce = Buffer.from(parts[1], "base64url");
  const ciphertext = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");
  if (nonce.length !== NONCE_BYTES || tag.length !== 16) {
    throw new Error("Invalid credential payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", input.key, nonce);
  decipher.setAAD(Buffer.from(input.aad, "utf8"));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Credential AAD mismatch.");
  }
}

export function packedKeyVersion(packed: string): number {
  const match = /^v(\d+)\./.exec(packed);
  if (!match) throw new Error("Invalid credential version.");
  return Number.parseInt(match[1], 10);
}
