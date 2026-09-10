import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/portfolio/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { githubOAuthConfigured, MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { accessTokenForConnection } from "@/lib/github/tokens";
import { syncConnectionContributions, type SyncConnection } from "@/lib/github/sync";
import { GITHUB_UNAVAILABLE } from "@/lib/repository-analysis/errors";

const ADMIN_CONNECTION_COLUMNS =
  "id, owner_id, github_user_id, github_login, epoch, status, last_synced_at, last_sync_error, sync_cursor";

export async function POST() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (!githubOAuthConfigured()) {
    return NextResponse.json({ error: GITHUB_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.json({ error: GITHUB_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("github_connections")
    .select(ADMIN_CONNECTION_COLUMNS)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Connect GitHub before refreshing activity." }, { status: 409 });
  }
  const connection = data as SyncConnection;
  try {
    const live = await accessTokenForConnection(admin, {
      connectionId: connection.id,
      ownerId: connection.owner_id,
      epoch: connection.epoch,
      login: connection.github_login,
      githubUserId: connection.github_user_id,
      key: crypto.key,
      keyVersion: crypto.keyVersion,
    });
    const result = await syncConnectionContributions(admin, { connection, token: live.accessToken });
    if (!result.ok && result.kind === "throttled") {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.message, retryAt: result.retryAt ?? null }, { status: result.kind === "reauth" ? 409 : 502 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "GitHub activity could not be refreshed." }, { status: 502 });
  }
}
