import { GITHUB_TOKEN_PATH } from "./config";
import { apiEndpoint, githubFetch, githubJson } from "./http";

export type GithubTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

export type GithubIdentity = {
  id: number;
  login: string;
};

const UNRECOVERABLE_TOKEN_ERRORS = new Set([
  "bad_refresh_token",
  "bad_verification_code",
  "invalid_grant",
]);

export class GithubTokenError extends Error {
  constructor(
    message: string,
    readonly unrecoverable: boolean
  ) {
    super(message);
  }
}

type TokenJson = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

type UserJson = {
  id?: number;
  login?: string;
};

export async function exchangeAuthorizationCode(
  input: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
    verifier: string;
    now?: number;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<GithubTokenSet> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  });
  const { text } = await githubFetch(GITHUB_TOKEN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    timeoutMs: 8000,
    maxBytes: 16_384,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  return parseTokenSet(text, input.now ?? Date.now());
}

export async function refreshAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  now?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<GithubTokenSet> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  const { text } = await githubFetch(GITHUB_TOKEN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    timeoutMs: 8000,
    maxBytes: 16_384,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  return parseTokenSet(text, input.now ?? Date.now());
}

export async function fetchGithubIdentity(
  token: string,
  fetchImpl?: typeof fetch,
  signal?: AbortSignal
): Promise<GithubIdentity> {
  const { text } = await githubFetch(apiEndpoint("/user"), {
    timeoutMs: 8000,
    maxBytes: 32_768,
    token,
    signal,
    fetchImpl,
  });
  const json = githubJson<UserJson>(text);
  if (!Number.isInteger(json.id) || !json.login?.trim()) {
    throw new Error("GitHub identity was incomplete.");
  }
  return { id: json.id as number, login: json.login.trim() };
}

function parseTokenSet(text: string, now: number): GithubTokenSet {
  const json = githubJson<TokenJson>(text);
  if (!json.access_token) {
    const unrecoverable = UNRECOVERABLE_TOKEN_ERRORS.has(json.error ?? "");
    throw new GithubTokenError(
      json.error === "bad_verification_code" ? "GitHub authorization code was invalid." : "GitHub token exchange failed.",
      unrecoverable
    );
  }
  const expiresAt =
    typeof json.expires_in === "number" && json.expires_in > 0
      ? new Date(now + json.expires_in * 1000 - 60_000).toISOString()
      : null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt,
  };
}
