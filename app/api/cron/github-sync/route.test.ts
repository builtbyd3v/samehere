import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRON_CONNECTION_BUDGET_MS, CRON_DEADLINE_MS, type SyncConnection } from "@/lib/github/sync";

const from = vi.fn();
const tokenFor = vi.fn();
const syncFn = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from,
    rpc: vi.fn(),
  }),
}));

vi.mock("@/lib/github/tokens", () => ({
  accessTokenForConnection: (...args: unknown[]) => tokenFor(...args),
}));

vi.mock("@/lib/github/sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/github/sync")>();
  return {
    ...actual,
    syncConnectionContributions: (...args: unknown[]) => syncFn(...args),
  };
});

const { GET, maxDuration } = await import("./route");

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/github-sync", { headers });
}

function connection(id: string, updatedAt: string | null): SyncConnection {
  return {
    id,
    owner_id: "owner-1",
    epoch: 1,
    github_login: "ada",
    github_user_id: 1,
    status: "connected",
    last_synced_at: "2026-09-01T00:00:00.000Z",
    last_sync_error: null,
    sync_cursor: null,
    updated_at: updatedAt,
  };
}

type OrderSpy = (column: string, opts: { ascending: boolean; nullsFirst: boolean }) => void;

function listConnected(rows: SyncConnection[], orderSpy: OrderSpy) {
  from.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: (column: string, opts: { ascending: boolean; nullsFirst: boolean }) => {
          orderSpy(column, opts);
          return {
            limit: async () => ({ data: rows, error: null }),
          };
        },
      }),
    }),
  });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
  from.mockReset();
  tokenFor.mockReset();
  syncFn.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/github-sync — auth guard", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 200 and skips work when GitHub is unconfigured", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skipped?: boolean };
    expect(body.skipped).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/github-sync — deadline / round-robin", () => {
  it("exports a literal maxDuration of 120", () => {
    expect(maxDuration).toBe(120);
  });

  it("orders by updated_at and counts leftover connections as skipped", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "secret");
    vi.stubEnv("GITHUB_OAUTH_CALLBACK_URL", "https://samehere.dev/api/integrations/github/callback");
    vi.stubEnv("GITHUB_CREDENTIALS_KEY", "a".repeat(64));
    const orderSpy = vi.fn<OrderSpy>();
    listConnected([connection("c-old", null), connection("c-newer", "2026-09-09T00:00:00.000Z")], orderSpy);
    let n = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      n += 1;
      if (n === 1) return 0;
      return CRON_DEADLINE_MS - CRON_CONNECTION_BUDGET_MS + 1;
    });
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(orderSpy).toHaveBeenCalledWith("updated_at", { ascending: true, nullsFirst: true });
    expect(await res.json()).toEqual({
      ok: true,
      considered: 2,
      synced: 0,
      failed: 0,
      skipped: 2,
      connectionBudgetMs: CRON_CONNECTION_BUDGET_MS,
    });
    expect(tokenFor).not.toHaveBeenCalled();
  });

  it("syncs one connection then skips the rest once the budget is gone", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "secret");
    vi.stubEnv("GITHUB_OAUTH_CALLBACK_URL", "https://samehere.dev/api/integrations/github/callback");
    vi.stubEnv("GITHUB_CREDENTIALS_KEY", "a".repeat(64));
    const orderSpy = vi.fn<OrderSpy>();
    listConnected([connection("c1", null), connection("c2", "2026-09-09T00:00:00.000Z")], orderSpy);
    let n = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      n += 1;
      if (n <= 2) return 0;
      return CRON_DEADLINE_MS - CRON_CONNECTION_BUDGET_MS + 1;
    });
    tokenFor.mockResolvedValue({ accessToken: "gho_x" });
    syncFn.mockResolvedValue({ ok: true, wrote: 1, complete: true, partial: false });
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(orderSpy).toHaveBeenCalledWith("updated_at", { ascending: true, nullsFirst: true });
    expect(await res.json()).toEqual({
      ok: true,
      considered: 2,
      synced: 1,
      failed: 0,
      skipped: 1,
      connectionBudgetMs: CRON_CONNECTION_BUDGET_MS,
    });
    expect(syncFn).toHaveBeenCalledTimes(1);
  });
});
