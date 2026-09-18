import type { GithubAdminClient } from "./admin";
import { GITHUB_CLIENT_ID_ENV, GITHUB_CLIENT_SECRET_ENV } from "./config";
import { GithubHttpError } from "./http";
import { fetchGithubIdentity, GithubTokenError, refreshAccessToken, type GithubTokenSet } from "./identity";
import { decryptStoredTokens, loadCredentials, markConnectionStatus, storeEncryptedTokens } from "./store";

export type LiveGithubToken = {
  accessToken: string;
  connectionId: string;
  ownerId: string;
  epoch: number;
  login: string;
  githubUserId: number;
};

export function isUnrecoverableGithubAuth(error: unknown): boolean {
  if (error instanceof GithubHttpError) return error.kind === "reauth";
  if (error instanceof GithubTokenError) return error.unrecoverable;
  return false;
}

export async function accessTokenForConnection(
  admin: GithubAdminClient,
  input: {
    connectionId: string;
    ownerId: string;
    epoch: number;
    login: string;
    githubUserId: number;
    key: Buffer;
    keyVersion: number;
    now?: Date;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<LiveGithubToken> {
  const record = await loadCredentials(admin, input.connectionId);
  if (!record) {
    await markConnectionStatus(admin, input.connectionId, input.epoch, "reauthorization_needed", "GitHub needs to be reconnected");
    throw new GithubHttpError("GitHub access was revoked.", 401, "reauth");
  }
  if (record.connection_epoch !== input.epoch || record.owner_id !== input.ownerId) {
    throw new GithubHttpError("GitHub access was revoked.", 401, "reauth");
  }
  let tokens = decryptStoredTokens(record, input.key);
  const now = input.now ?? new Date();
  if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() <= now.getTime()) {
    tokens = await refreshOrReauth(admin, input, tokens);
  }
  return {
    accessToken: tokens.accessToken,
    connectionId: input.connectionId,
    ownerId: input.ownerId,
    epoch: input.epoch,
    login: input.login,
    githubUserId: input.githubUserId,
  };
}

async function refreshOrReauth(
  admin: GithubAdminClient,
  input: {
    connectionId: string;
    ownerId: string;
    epoch: number;
    login: string;
    githubUserId: number;
    key: Buffer;
    keyVersion: number;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  },
  tokens: GithubTokenSet
): Promise<GithubTokenSet> {
  if (!tokens.refreshToken) {
    await markConnectionStatus(admin, input.connectionId, input.epoch, "reauthorization_needed", "GitHub access expired");
    throw new GithubHttpError("GitHub access was revoked.", 401, "reauth");
  }
  try {
    const refreshed = await refreshAccessToken({
      clientId: process.env[GITHUB_CLIENT_ID_ENV] ?? "",
      clientSecret: process.env[GITHUB_CLIENT_SECRET_ENV] ?? "",
      refreshToken: tokens.refreshToken,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    });
    const identity = await fetchGithubIdentity(refreshed.accessToken, input.fetchImpl, input.signal);
    if (identity.id !== input.githubUserId) {
      throw new GithubHttpError("GitHub access was revoked.", 401, "reauth");
    }
    await storeEncryptedTokens(admin, {
      ownerId: input.ownerId,
      connectionId: input.connectionId,
      epoch: input.epoch,
      tokens: refreshed,
      key: input.key,
      keyVersion: input.keyVersion,
    });
    return refreshed;
  } catch (error) {
    if (isUnrecoverableGithubAuth(error)) {
      await markConnectionStatus(admin, input.connectionId, input.epoch, "reauthorization_needed", "GitHub access was revoked");
      throw error instanceof GithubHttpError ? error : new GithubHttpError("GitHub access was revoked.", 401, "reauth");
    }
    throw error;
  }
}

export async function handleGithubAuthFailure(
  admin: GithubAdminClient,
  connectionId: string,
  epoch: number,
  error: unknown
): Promise<boolean> {
  if (!isUnrecoverableGithubAuth(error)) return false;
  await markConnectionStatus(admin, connectionId, epoch, "reauthorization_needed", "GitHub access was revoked");
  return true;
}
