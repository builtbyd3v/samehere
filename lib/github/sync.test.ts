import { describe, expect, it, vi } from "vitest";
import { githubAdminForTest } from "./admin";
import { GithubHttpError } from "./http";
import {
  CRON_CONNECTION_BUDGET_MS,
  CRON_DEADLINE_MS,
  cronHasBudget,
  refreshThrottled,
  replaceContributionSnapshot,
  shouldSkipForBackoff,
  syncConnectionContributions,
  type SyncConnection,
} from "./sync";

type RpcResult = { data: unknown; error: { message?: string } | null };
type RpcFn = (args?: Record<string, unknown>) => Promise<RpcResult>;
type UpdateFn = (values: Record<string, unknown>) => Promise<{ data: null; error: null }>;

function adminMock(rpcs: Record<string, RpcFn>, update: ReturnType<typeof vi.fn<UpdateFn>> = vi.fn<UpdateFn>(async () => ({ data: null, error: null }))) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    update: (values: Record<string, unknown>) => {
      void update(values);
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    then: (resolve: (value: { data: unknown; error: null }) => unknown) => Promise.resolve(resolve({ data: null, error: null })),
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const admin = githubAdminForTest({
    rpc: async (name, args) => {
      const handler = rpcs[name];
      if (!handler) return { data: null, error: { message: `missing ${name}` } };
      return handler(args);
    },
    from: () => chain,
  });
  return Object.assign(admin, { update });
}

const connection: SyncConnection = {
  id: "conn-1",
  owner_id: "owner-1",
  epoch: 2,
  github_login: "ada",
  github_user_id: 42,
  status: "connected",
  last_synced_at: null,
  last_sync_error: null,
  sync_cursor: null,
  updated_at: null,
};

describe("refresh / backoff gates", () => {
  it("throttles a fresh success and not a failed snapshot", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(refreshThrottled(new Date(now.getTime() - 60_000).toISOString(), null, now)).toBe(true);
    expect(refreshThrottled(new Date(now.getTime() - 60_000).toISOString(), "GitHub rate limited this refresh.", now)).toBe(false);
  });

  it("skips connections still in backoff", () => {
    expect(
      shouldSkipForBackoff(
        { v: 1, from: "a", to: "b", offset: 0, nextRetryAt: "2026-09-10T13:00:00Z", backoffSeconds: 60 },
        new Date("2026-09-10T12:00:00Z")
      )
    ).toBe(true);
  });
});

describe("cronHasBudget", () => {
  it("stops the next connection when remaining time is under the per-connection budget", () => {
    expect(cronHasBudget(0, 0)).toBe(true);
    expect(cronHasBudget(0, CRON_DEADLINE_MS - CRON_CONNECTION_BUDGET_MS)).toBe(true);
    expect(cronHasBudget(0, CRON_DEADLINE_MS - CRON_CONNECTION_BUDGET_MS + 1)).toBe(false);
  });
});

describe("replaceContributionSnapshot", () => {
  it("writes the full year through the snapshot RPC", async () => {
    const replace = vi.fn<RpcFn>(async () => ({ data: 2, error: null }));
    const admin = adminMock({ replace_github_contribution_snapshot: replace });
    const wrote = await replaceContributionSnapshot(admin, {
      connectionId: "conn-1",
      epoch: 2,
      days: [
        { date: "2026-01-01", count: 1, level: 1 },
        { date: "2026-01-02", count: 2, level: 2 },
      ],
      from: "2025-09-10",
      to: "2026-09-10",
    });
    expect(wrote).toBe(2);
    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({
        p_connection_id: "conn-1",
        p_expected_epoch: 2,
        p_from: "2025-09-10",
        p_to: "2026-09-10",
      })
    );
    const days = replace.mock.calls[0][0]?.p_days;
    expect(Array.isArray(days) ? days : []).toHaveLength(2);
  });
});

describe("syncConnectionContributions", () => {
  it("keeps prior days and records backoff on rate limit", async () => {
    const mark = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = adminMock({
      replace_github_contribution_snapshot: vi.fn<RpcFn>(async () => ({ data: 0, error: null })),
      mark_github_connection_status: mark,
    });
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new GithubHttpError("rate-limit:30", 403, "rate_limit");
    });
    const result = await syncConnectionContributions(admin, {
      connection,
      token: "gho_x",
      now: new Date("2026-09-10T12:00:00Z"),
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("rate_limit");
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_sync_error: "GitHub rate limited this refresh.",
        updated_at: "2026-09-10T12:00:00.000Z",
      })
    );
    expect(admin.update).not.toHaveBeenCalledWith(expect.objectContaining({ last_synced_at: expect.anything() }));
    expect(mark).not.toHaveBeenCalled();
  });

  it("replaces the year atomically and stamps last_synced_at plus updated_at", async () => {
    const replace = vi.fn<RpcFn>(async () => ({ data: 2, error: null }));
    const upsertDay = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = adminMock({
      replace_github_contribution_snapshot: replace,
      upsert_github_contribution_day: upsertDay,
    });
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              user: {
                contributionsCollection: {
                  contributionCalendar: {
                    weeks: [
                      {
                        contributionDays: [
                          { date: "2026-01-01", contributionCount: 1, contributionLevel: "FIRST_QUARTILE" },
                          { date: "2026-01-02", contributionCount: 2, contributionLevel: "SECOND_QUARTILE" },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          })
        )
    );
    const result = await syncConnectionContributions(admin, {
      connection,
      token: "gho_x",
      now: new Date("2026-09-10T12:00:00Z"),
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, wrote: 2, complete: true, partial: false });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(upsertDay).not.toHaveBeenCalled();
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_synced_at: "2026-09-10T12:00:00.000Z",
        updated_at: "2026-09-10T12:00:00.000Z",
        last_sync_error: null,
      })
    );
  });
});
