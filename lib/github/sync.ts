import { DEFAULT_REFRESH_THROTTLE_MS } from "./config";
import {
  encodeSyncCursor,
  fetchContributionYear,
  parseSyncCursor,
  rollingYearWindow,
  type GithubContributionSample,
  type SyncCursor,
} from "./contributions";
import { GithubHttpError, retryAfterMs } from "./http";
import { handleGithubAuthFailure } from "./tokens";
import type { GithubAdminClient } from "./admin";

export const CRON_DEADLINE_MS = 110_000;
export const CRON_CONNECTION_BUDGET_MS = 30_000;

export function cronHasBudget(
  startedAt: number,
  nowMs: number,
  deadlineMs = CRON_DEADLINE_MS,
  perConnectionMs = CRON_CONNECTION_BUDGET_MS
): boolean {
  return deadlineMs - (nowMs - startedAt) >= perConnectionMs;
}

export type SyncConnection = {
  id: string;
  owner_id: string;
  epoch: number;
  github_login: string;
  github_user_id: number;
  status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  sync_cursor: string | null;
  updated_at: string | null;
};

export type SyncResult =
  | { ok: true; wrote: number; complete: true; partial: false }
  | { ok: false; kind: "reauth" | "rate_limit" | "backoff" | "throttled" | "inactive" | "error"; retryAt?: string; message: string };

export function shouldSkipForBackoff(cursor: SyncCursor | null, now: Date): boolean {
  if (!cursor?.nextRetryAt) return false;
  return new Date(cursor.nextRetryAt).getTime() > now.getTime();
}

export function refreshThrottled(
  lastSyncedAt: string | null,
  lastSyncError: string | null,
  now: Date,
  throttleMs = DEFAULT_REFRESH_THROTTLE_MS
): boolean {
  if (lastSyncError) return false;
  if (!lastSyncedAt) return false;
  return now.getTime() - new Date(lastSyncedAt).getTime() < throttleMs;
}

function utcDate(iso: string): string {
  return iso.slice(0, 10);
}

export async function replaceContributionSnapshot(
  admin: GithubAdminClient,
  input: {
    connectionId: string;
    epoch: number;
    days: GithubContributionSample[];
    from: string;
    to: string;
  }
): Promise<number> {
  const result = await admin.rpc("replace_github_contribution_snapshot", {
    p_connection_id: input.connectionId,
    p_expected_epoch: input.epoch,
    p_days: input.days,
    p_from: input.from,
    p_to: input.to,
  });
  if (result.error) throw new Error(result.error.message || "Could not store contribution snapshot.");
  return typeof result.data === "number" ? result.data : input.days.length;
}

export async function saveSyncBackoff(
  admin: GithubAdminClient,
  input: {
    connectionId: string;
    epoch: number;
    cursor: SyncCursor;
    lastSyncError: string | null;
    now?: Date;
  }
): Promise<void> {
  const now = input.now ?? new Date();
  const result = await admin
    .from("github_connections")
    .update({
      sync_cursor: encodeSyncCursor(input.cursor),
      last_sync_error: input.lastSyncError,
      last_error_at: input.lastSyncError ? now.toISOString() : null,
      updated_at: now.toISOString(),
    })
    .eq("id", input.connectionId)
    .eq("epoch", input.epoch);
  if (result.error) throw new Error(result.error.message || "Could not save sync backoff.");
}

export async function stampSyncAttempt(
  admin: GithubAdminClient,
  input: { connectionId: string; epoch: number; now?: Date }
): Promise<void> {
  const now = input.now ?? new Date();
  const result = await admin
    .from("github_connections")
    .update({ updated_at: now.toISOString() })
    .eq("id", input.connectionId)
    .eq("epoch", input.epoch);
  if (result.error) throw new Error(result.error.message || "Could not stamp sync attempt.");
}

export async function stampSyncSuccess(
  admin: GithubAdminClient,
  input: { connectionId: string; epoch: number; now?: Date }
): Promise<void> {
  const now = input.now ?? new Date();
  const result = await admin
    .from("github_connections")
    .update({
      last_synced_at: now.toISOString(),
      last_sync_error: null,
      last_error_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", input.connectionId)
    .eq("epoch", input.epoch);
  if (result.error) throw new Error(result.error.message || "Could not stamp sync success.");
}

export async function syncConnectionContributions(
  admin: GithubAdminClient,
  input: {
    connection: SyncConnection;
    token: string;
    now?: Date;
    fetchImpl?: typeof fetch;
    throttleMs?: number;
    force?: boolean;
    signal?: AbortSignal;
  }
): Promise<SyncResult> {
  const now = input.now ?? new Date();
  if (input.connection.status !== "connected") {
    return { ok: false, kind: "inactive", message: "GitHub connection is not active." };
  }
  const existing = parseSyncCursor(input.connection.sync_cursor);
  if (!input.force && shouldSkipForBackoff(existing, now)) {
    return { ok: false, kind: "backoff", retryAt: existing?.nextRetryAt ?? undefined, message: "Waiting on GitHub rate-limit backoff." };
  }
  if (!input.force && refreshThrottled(input.connection.last_synced_at, input.connection.last_sync_error, now, input.throttleMs)) {
    return { ok: false, kind: "throttled", message: "GitHub activity was just refreshed." };
  }

  const window = rollingYearWindow(now);
  let days: GithubContributionSample[];
  try {
    days = await fetchContributionYear({
      token: input.token,
      login: input.connection.github_login,
      now,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    });
  } catch (error) {
    if (await handleGithubAuthFailure(admin, input.connection.id, input.connection.epoch, error)) {
      await stampSyncAttempt(admin, {
        connectionId: input.connection.id,
        epoch: input.connection.epoch,
        now,
      });
      return { ok: false, kind: "reauth", message: "GitHub needs to be reconnected." };
    }
    if (error instanceof GithubHttpError && error.kind === "rate_limit") {
      const wait = retryAfterMs(error, Math.min(Math.max((existing?.backoffSeconds ?? 30) * 2, 30), 3600) * 1000);
      const cursor: SyncCursor = {
        v: 1,
        from: existing?.from ?? window.from,
        to: existing?.to ?? window.to,
        offset: existing?.offset ?? 0,
        nextRetryAt: new Date(now.getTime() + wait).toISOString(),
        backoffSeconds: Math.ceil(wait / 1000),
      };
      await saveSyncBackoff(admin, {
        connectionId: input.connection.id,
        epoch: input.connection.epoch,
        cursor,
        lastSyncError: "GitHub rate limited this refresh.",
        now,
      });
      return { ok: false, kind: "rate_limit", retryAt: cursor.nextRetryAt ?? undefined, message: "GitHub rate limited this refresh." };
    }
    await saveSyncBackoff(admin, {
      connectionId: input.connection.id,
      epoch: input.connection.epoch,
      cursor: existing ?? { v: 1, from: window.from, to: window.to, offset: 0, nextRetryAt: null, backoffSeconds: 0 },
      lastSyncError: "GitHub activity could not be refreshed.",
      now,
    });
    return { ok: false, kind: "error", message: "GitHub activity could not be refreshed." };
  }

  try {
    const wrote = await replaceContributionSnapshot(admin, {
      connectionId: input.connection.id,
      epoch: input.connection.epoch,
      days,
      from: utcDate(window.from),
      to: utcDate(window.to),
    });
    await stampSyncSuccess(admin, {
      connectionId: input.connection.id,
      epoch: input.connection.epoch,
      now,
    });
    return { ok: true, wrote, complete: true, partial: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not store contribution snapshot.";
    if (message.includes("stale connection epoch") || message.includes("github connection inactive")) {
      return { ok: false, kind: "inactive", message: "GitHub connection is not active." };
    }
    throw error;
  }
}
