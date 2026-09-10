import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/github/cron-auth";
import { githubOAuthConfigured, githubSyncBatchLimit } from "@/lib/github/config";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { accessTokenForConnection } from "@/lib/github/tokens";
import {
  CRON_CONNECTION_BUDGET_MS,
  CRON_DEADLINE_MS,
  cronHasBudget,
  stampSyncAttempt,
  syncConnectionContributions,
  type SyncConnection,
} from "@/lib/github/sync";

export const maxDuration = 120;

const ADMIN_CONNECTION_COLUMNS =
  "id, owner_id, github_user_id, github_login, epoch, status, last_synced_at, last_sync_error, sync_cursor, updated_at";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!githubOAuthConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "unconfigured" });
  }
  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.json({ ok: true, skipped: true, reason: "unconfigured" });
  }

  const admin = createAdminClient();
  const limit = githubSyncBatchLimit();
  const listed = await admin
    .from("github_connections")
    .select(ADMIN_CONNECTION_COLUMNS)
    .eq("status", "connected")
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (listed.error) {
    return NextResponse.json({ error: "Could not list GitHub connections." }, { status: 503 });
  }
  const rows = (listed.data ?? []) as SyncConnection[];
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRON_DEADLINE_MS);
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  try {
    for (let i = 0; i < rows.length; i += 1) {
      if (!cronHasBudget(started, Date.now())) {
        skipped += rows.length - i;
        break;
      }
      const connection = rows[i];
      try {
        const live = await accessTokenForConnection(admin, {
          connectionId: connection.id,
          ownerId: connection.owner_id,
          epoch: connection.epoch,
          login: connection.github_login,
          githubUserId: connection.github_user_id,
          key: crypto.key,
          keyVersion: crypto.keyVersion,
          signal: controller.signal,
        });
        const result = await syncConnectionContributions(admin, {
          connection,
          token: live.accessToken,
          signal: controller.signal,
        });
        if (result.ok) synced += 1;
        else if (result.kind === "throttled" || result.kind === "backoff") skipped += 1;
        else failed += 1;
      } catch {
        try {
          await stampSyncAttempt(admin, { connectionId: connection.id, epoch: connection.epoch });
        } catch {
          // still count the failure
        }
        failed += 1;
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return NextResponse.json({
    ok: true,
    considered: rows.length,
    synced,
    failed,
    skipped,
    connectionBudgetMs: CRON_CONNECTION_BUDGET_MS,
  });
}
