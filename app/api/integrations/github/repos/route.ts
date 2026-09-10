import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/portfolio/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { githubOAuthConfigured, MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { OWNER_GITHUB_CONNECTION_COLUMNS } from "@/lib/github/contracts";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { accessTokenForConnection } from "@/lib/github/tokens";
import { listPublicReposForIdentity } from "@/lib/github/repos";
import { GithubHttpError } from "@/lib/github/http";
import { GITHUB_UNAVAILABLE } from "@/lib/repository-analysis/errors";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (!githubOAuthConfigured()) {
    return NextResponse.json({ error: GITHUB_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.json({ error: GITHUB_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const page = Number.parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10);
  const { data: connection, error } = await auth.client
    .from("github_connections")
    .select(OWNER_GITHUB_CONNECTION_COLUMNS)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (error || !connection || connection.status !== "connected") {
    return NextResponse.json(
      { error: "Connect GitHub before choosing a repository.", manualProjectPath: MANUAL_PROJECT_PATH },
      { status: 409 }
    );
  }
  try {
    const admin = createAdminClient();
    const live = await accessTokenForConnection(admin, {
      connectionId: connection.id,
      ownerId: connection.owner_id,
      epoch: connection.epoch,
      login: connection.github_login,
      githubUserId: connection.github_user_id,
      key: crypto.key,
      keyVersion: crypto.keyVersion,
    });
    const listed = await listPublicReposForIdentity({ token: live.accessToken, page });
    return NextResponse.json({
      identity: { id: connection.github_user_id, login: connection.github_login },
      ...listed,
    });
  } catch (caught) {
    if (caught instanceof GithubHttpError && caught.kind === "reauth") {
      return NextResponse.json({ error: "GitHub needs to be reconnected." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not list public repositories." }, { status: 502 });
  }
}
