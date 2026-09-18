import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { classifyAnalysisRpc } from "@/lib/repository-analysis/errors";
import {
  GITHUB_CLIENT_ID_ENV,
  GITHUB_OAUTH_CALLBACK_URL_ENV,
  GITHUB_OAUTH_COOKIE,
  githubOAuthConfigured,
} from "@/lib/github/config";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { createOAuthCookie, destWithGithubError, localReturnPath } from "@/lib/github/oauth";

export async function GET(request: Request) {
  const auth = await requireOwner();
  const dest = localReturnPath(new URL(request.url).searchParams.get("next"));
  if (!auth.ok) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(dest)}`, request.url));
  }
  if (!githubOAuthConfigured()) {
    return NextResponse.redirect(new URL(destWithGithubError(dest, "unavailable"), request.url));
  }
  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.redirect(new URL(destWithGithubError(dest, "unavailable"), request.url));
  }
  const created = createOAuthCookie({
    key: crypto.key,
    keyVersion: crypto.keyVersion,
    userId: auth.userId,
    dest,
    secure: process.env.NODE_ENV === "production",
    clientId: process.env[GITHUB_CLIENT_ID_ENV] ?? "",
    redirectUri: process.env[GITHUB_OAUTH_CALLBACK_URL_ENV] ?? "",
  });
  const store = await cookies();
  store.set(GITHUB_OAUTH_COOKIE, created.packed, created.cookieOptions);
  return NextResponse.redirect(created.authorizeUrl);
}

export async function DELETE() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { error } = await auth.client.rpc("disconnect_github_connection");
  if (error) return resultResponse(classifyAnalysisRpc(error));
  return NextResponse.json({ ok: true, writtenProjectsRemain: true });
}
