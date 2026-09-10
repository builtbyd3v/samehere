import { describe, expect, it } from "vitest";
import {
  createPkcePair,
  decryptSecret,
  encryptSecret,
  parseCredentialsKey,
} from "./crypto";
import { tryCryptoFromEnv } from "./store";

const KEY_HEX = "a".repeat(64);
const KEY = parseCredentialsKey(KEY_HEX);

describe("parseCredentialsKey", () => {
  it("accepts 32-byte hex and base64", () => {
    expect(parseCredentialsKey(KEY_HEX).length).toBe(32);
    expect(parseCredentialsKey(Buffer.alloc(32, 7).toString("base64")).length).toBe(32);
  });

  it("rejects short or empty keys", () => {
    expect(() => parseCredentialsKey("abcd")).toThrow(/GITHUB_CREDENTIALS_KEY/);
    expect(() => parseCredentialsKey("")).toThrow(/GITHUB_CREDENTIALS_KEY/);
  });

  it("tryCryptoFromEnv fails closed on a malformed key", () => {
    expect(tryCryptoFromEnv({ GITHUB_CREDENTIALS_KEY: "not-32-bytes" }).ok).toBe(false);
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips with owner/connection AAD", () => {
    const aad = "github-credentials:v1:owner-1:conn-1";
    const packed = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "gho_test", aad });
    expect(packed.startsWith("v1.")).toBe(true);
    expect(packed).not.toContain("gho_test");
    expect(decryptSecret({ key: KEY, packed, aad })).toBe("gho_test");
  });

  it("uses a random nonce each time", () => {
    const aad = "github-credentials:v1:owner-1:conn-1";
    const a = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "gho_test", aad });
    const b = encryptSecret({ key: KEY, keyVersion: 1, plaintext: "gho_test", aad });
    expect(a).not.toBe(b);
  });

  it("rejects AAD / purpose mismatch", () => {
    const packed = encryptSecret({
      key: KEY,
      keyVersion: 1,
      plaintext: "gho_test",
      aad: "github-credentials:v1:owner-1:conn-1",
    });
    expect(() =>
      decryptSecret({
        key: KEY,
        packed,
        aad: "github-credentials:v1:owner-2:conn-1",
      })
    ).toThrow(/aad/i);
  });

  it("rejects version mismatch in the packed header", () => {
    const packed = encryptSecret({
      key: KEY,
      keyVersion: 1,
      plaintext: "gho_test",
      aad: "github-oauth-state:v1",
    });
    const tampered = packed.replace(/^v1\./, "v2.");
    expect(() => decryptSecret({ key: KEY, packed: tampered, aad: "github-oauth-state:v1" })).toThrow(
      /version/i
    );
  });
});

describe("createPkcePair", () => {
  it("builds an S256 challenge from a 43+ char verifier", () => {
    const { verifier, challenge, method } = createPkcePair();
    expect(method).toBe("S256");
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toBe(verifier);
  });
});
