import { randomBytes } from "node:crypto";
import {
  GITHUB_AUTHORIZE_PATH,
  GITHUB_OAUTH_SCOPE,
  GITHUB_OAUTH_TTL_SECONDS,
  oauthStateAad,
} from "./config";
import { createPkcePair, decryptSecret, encryptSecret } from "./crypto";
import { localReturnPath } from "./paths";

export { destWithGithubError, localReturnPath } from "./paths";

export const GITHUB_AUTHORIZE_URL = GITHUB_AUTHORIZE_PATH;
export const OAUTH_COOKIE_NAME = "sh_gh_oauth";

type OAuthPayload = {
  state: string;
  verifier: string;
  userId: string;
  dest: string;
  iat: number;
};

export type OAuthCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  path: string;
};

export function oauthCookieOptions(secure: boolean): OAuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: GITHUB_OAUTH_TTL_SECONDS,
    path: "/api/integrations/github",
  };
}

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: GITHUB_OAUTH_SCOPE,
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
  });
  return `${GITHUB_AUTHORIZE_PATH}?${params.toString()}`;
}

export function createOAuthCookie(input: {
  key: Buffer;
  keyVersion: number;
  userId: string;
  dest: string;
  now?: number;
  secure?: boolean;
  clientId?: string;
  redirectUri?: string;
}): {
  packed: string;
  state: string;
  authorizeUrl: string;
  cookieOptions: OAuthCookieOptions;
} {
  const pkce = createPkcePair();
  const state = randomBytes(16).toString("base64url");
  const dest = localReturnPath(input.dest);
  const payload: OAuthPayload = {
    state,
    verifier: pkce.verifier,
    userId: input.userId,
    dest,
    iat: input.now ?? Date.now(),
  };
  const packed = encryptSecret({
    key: input.key,
    keyVersion: input.keyVersion,
    plaintext: JSON.stringify(payload),
    aad: oauthStateAad(input.keyVersion),
  });
  return {
    packed,
    state,
    authorizeUrl: buildAuthorizeUrl({
      clientId: input.clientId ?? "missing",
      redirectUri: input.redirectUri ?? "http://localhost/api/integrations/github/callback",
      state,
      challenge: pkce.challenge,
    }),
    cookieOptions: oauthCookieOptions(input.secure ?? false),
  };
}

export type ConsumeOAuthResult =
  | { ok: true; userId: string; dest: string; verifier: string }
  | { ok: false; reason: "state" | "session" | "expired" | "invalid" };

export function consumeOAuthCookie(input: {
  key: Buffer;
  packed: string;
  returnedState: string;
  sessionUserId: string;
  now?: number;
}): ConsumeOAuthResult {
  let payload: OAuthPayload;
  try {
    const version = /^v(\d+)\./.exec(input.packed);
    const keyVersion = version ? Number.parseInt(version[1], 10) : 1;
    payload = JSON.parse(
      decryptSecret({
        key: input.key,
        packed: input.packed,
        aad: oauthStateAad(keyVersion),
      })
    ) as OAuthPayload;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!payload?.state || !payload.verifier || !payload.userId) {
    return { ok: false, reason: "invalid" };
  }
  if (payload.state !== input.returnedState) return { ok: false, reason: "state" };
  if (payload.userId !== input.sessionUserId) return { ok: false, reason: "session" };
  const now = input.now ?? Date.now();
  if (!Number.isFinite(payload.iat) || now - payload.iat > GITHUB_OAUTH_TTL_SECONDS * 1000) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, userId: payload.userId, dest: localReturnPath(payload.dest), verifier: payload.verifier };
}

export function githubOAuthError(query: { error?: string | null; code?: string | null; state?: string | null }):
  | "denied"
  | "missing_code"
  | "missing_state"
  | null {
  if (query.error === "access_denied") return "denied";
  if (query.error) return "denied";
  if (!query.code) return "missing_code";
  if (!query.state) return "missing_state";
  return null;
}

