import { after } from "next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GITHUB_CLIENT_ID_ENV,
  GITHUB_CLIENT_SECRET_ENV,
  GITHUB_OAUTH_CALLBACK_URL_ENV,
  GITHUB_OAUTH_COOKIE,
  githubOAuthConfigured,
} from "@/lib/github/config";
import { tryCryptoFromEnv, storeEncryptedTokens, upsertConnectedIdentity } from "@/lib/github/store";
import { consumeOAuthCookie, destWithGithubError, githubOAuthError, localReturnPath } from "@/lib/github/oauth";
import { exchangeAuthorizationCode, fetchGithubIdentity } from "@/lib/github/identity";
import { syncConnectionContributions, type SyncConnection } from "@/lib/github/sync";
import { accessTokenForConnection } from "@/lib/github/tokens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destHint = localReturnPath(url.searchParams.get("next"));
  const store = await cookies();
  const packed = store.get(GITHUB_OAUTH_COOKIE)?.value ?? "";
  store.set(GITHUB_OAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/api/integrations/github", maxAge: 0 });

  const mapped = githubOAuthError({
    error: url.searchParams.get("error"),
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
  if (mapped === "denied") {
    return NextResponse.redirect(new URL(destWithGithubError(destHint, "denied"), request.url));
  }
  if (mapped) {
    return NextResponse.redirect(new URL(destWithGithubError(destHint, mapped === "missing_state" ? "state" : "denied"), request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!githubOAuthConfigured() || !packed) {
    return NextResponse.redirect(new URL(destWithGithubError(destHint, "unavailable"), request.url));
  }

  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.redirect(new URL(destWithGithubError(destHint, "unavailable"), request.url));
  }
  const consumed = consumeOAuthCookie({
    key: crypto.key,
    packed,
    returnedState: url.searchParams.get("state") ?? "",
    sessionUserId: user.id,
  });
  if (!consumed.ok) {
    const reason = consumed.reason === "session" ? "session" : consumed.reason === "state" ? "state" : "denied";
    return NextResponse.redirect(new URL(destWithGithubError(destHint, reason), request.url));
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      clientId: process.env[GITHUB_CLIENT_ID_ENV] ?? "",
      clientSecret: process.env[GITHUB_CLIENT_SECRET_ENV] ?? "",
      code: url.searchParams.get("code") ?? "",
      redirectUri: process.env[GITHUB_OAUTH_CALLBACK_URL_ENV] ?? "",
      verifier: consumed.verifier,
    });
    const identity = await fetchGithubIdentity(tokens.accessToken);
    const admin = createAdminClient();
    const connection = await upsertConnectedIdentity(admin, user.id, identity);
    await storeEncryptedTokens(admin, {
      ownerId: user.id,
      connectionId: connection.connectionId,
      epoch: connection.epoch,
      tokens,
      key: crypto.key,
      keyVersion: crypto.keyVersion,
    });
    after(async () => {
      const live = await accessTokenForConnection(admin, {
        connectionId: connection.connectionId,
        ownerId: user.id,
        epoch: connection.epoch,
        login: connection.login,
        githubUserId: connection.githubUserId,
        key: crypto.key,
        keyVersion: crypto.keyVersion,
      });
      const row: SyncConnection = {
        id: connection.connectionId,
        owner_id: user.id,
        epoch: connection.epoch,
        github_login: connection.login,
        github_user_id: connection.githubUserId,
        status: "connected",
        last_synced_at: null,
        last_sync_error: null,
        sync_cursor: null,
        updated_at: null,
      };
      await syncConnectionContributions(admin, { connection: row, token: live.accessToken, force: true });
    });
    return NextResponse.redirect(new URL(consumed.dest, request.url));
  } catch {
    return NextResponse.redirect(new URL(destWithGithubError(consumed.dest, "identity"), request.url));
  }
}
