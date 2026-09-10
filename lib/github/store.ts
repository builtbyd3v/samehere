import type { GithubConnectionPublic, GithubCredentialsRecord } from "@/types/portfolio";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";
import type { GithubAdminClient } from "./admin";
import { credentialsAad, readKeyVersion, type EnvRecord } from "./config";
import { decryptSecret, encryptSecret, parseCredentialsKey } from "./crypto";
import type { GithubIdentity, GithubTokenSet } from "./identity";

export type { GithubAdminClient };

export function cryptoFromEnv(env: EnvRecord = process.env): { key: Buffer; keyVersion: number } {
  return {
    key: parseCredentialsKey(env.GITHUB_CREDENTIALS_KEY ?? ""),
    keyVersion: readKeyVersion(env.GITHUB_CREDENTIALS_KEY_VERSION),
  };
}

export function tryCryptoFromEnv(
  env: EnvRecord = process.env
): { ok: true; key: Buffer; keyVersion: number } | { ok: false } {
  try {
    return { ok: true, ...cryptoFromEnv(env) };
  } catch {
    return { ok: false };
  }
}

export async function upsertConnectedIdentity(
  admin: GithubAdminClient,
  ownerId: string,
  identity: GithubIdentity
): Promise<{ connectionId: string; epoch: number; login: string; githubUserId: number }> {
  const inserted = await admin.rpc("upsert_github_connection", {
    p_owner_id: ownerId,
    p_github_user_id: identity.id,
    p_github_login: identity.login,
  });
  if (inserted.error || typeof inserted.data !== "string") {
    throw new Error(inserted.error?.message || "Could not save GitHub connection.");
  }
  const row = await admin
    .from("github_connections")
    .select("id, epoch, github_login, github_user_id, status")
    .eq("id", inserted.data)
    .maybeSingle();
  if (row.error || !row.data || row.data.status !== "connected") {
    throw new Error(PORTFOLIO_RPC_ERRORS.connectionInactive);
  }
  return {
    connectionId: row.data.id,
    epoch: row.data.epoch,
    login: row.data.github_login,
    githubUserId: row.data.github_user_id,
  };
}

export async function storeEncryptedTokens(
  admin: GithubAdminClient,
  input: {
    ownerId: string;
    connectionId: string;
    epoch: number;
    tokens: GithubTokenSet;
    key: Buffer;
    keyVersion: number;
  }
): Promise<void> {
  const aad = credentialsAad(input.ownerId, input.connectionId, input.keyVersion);
  const result = await admin.rpc("upsert_github_credentials", {
    p_connection_id: input.connectionId,
    p_owner_id: input.ownerId,
    p_connection_epoch: input.epoch,
    p_access_token_encrypted: encryptSecret({
      key: input.key,
      keyVersion: input.keyVersion,
      plaintext: input.tokens.accessToken,
      aad,
    }),
    p_refresh_token_encrypted: input.tokens.refreshToken
      ? encryptSecret({
          key: input.key,
          keyVersion: input.keyVersion,
          plaintext: input.tokens.refreshToken,
          aad,
        })
      : "",
    p_expires_at: input.tokens.expiresAt ?? "",
    p_key_version: input.keyVersion,
  });
  if (result.error) throw new Error(result.error.message || "Could not store GitHub credentials.");
}

export async function loadCredentials(
  admin: GithubAdminClient,
  connectionId: string
): Promise<GithubCredentialsRecord | null> {
  const result = await admin.rpc("get_github_credentials", { p_connection_id: connectionId });
  if (result.error) throw new Error(result.error.message || "Could not read GitHub credentials.");
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row !== "object") return null;
  return row as GithubCredentialsRecord;
}

export function decryptStoredTokens(record: GithubCredentialsRecord, key: Buffer): GithubTokenSet {
  const aad = credentialsAad(record.owner_id, record.connection_id, record.key_version);
  return {
    accessToken: decryptSecret({ key, packed: record.access_token_encrypted, aad }),
    refreshToken: record.refresh_token_encrypted
      ? decryptSecret({ key, packed: record.refresh_token_encrypted, aad })
      : null,
    expiresAt: record.expires_at || null,
  };
}

export async function markConnectionStatus(
  admin: GithubAdminClient,
  connectionId: string,
  epoch: number,
  status: "connected" | "reauthorization_needed",
  safeError: string | null
): Promise<void> {
  const result = await admin.rpc("mark_github_connection_status", {
    p_connection_id: connectionId,
    p_expected_epoch: epoch,
    p_status: status,
    p_safe_error: safeError ?? "",
  });
  if (result.error) throw new Error(result.error.message || "Could not update GitHub connection.");
}

export type ConnectionRow = GithubConnectionPublic & {
  sync_cursor: string | null;
};
