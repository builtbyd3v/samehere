import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
const adminRpc = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    rpc,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: adminRpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  }),
}));

const { resetMetricRateLimitForTests } = await import("@/lib/portfolio/metrics");
const { POST, GET } = await import("./route");

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/portfolio/metrics", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMetricRateLimitForTests();
  vi.stubEnv("PORTFOLIO_METRICS_SECRET", "metrics-test-secret");
  getUser.mockReset();
  rpc.mockReset();
  adminRpc.mockReset();
  maybeSingle.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } } });
  rpc.mockResolvedValue({
    data: [
      {
        owner_id: "owner-1",
        username: "ada",
        is_private: false,
        publish_intro: true,
        publish_projects: true,
        publish_activity: false,
        publish_experience: false,
        publish_education: false,
        publish_posts: false,
        activity_visible: false,
      },
    ],
    error: null,
  });
  adminRpc.mockResolvedValue({ data: true, error: null });
  maybeSingle.mockResolvedValue({
    data: {
      id: "11111111-1111-4111-8111-111111111111",
      owner_id: "owner-1",
      status: "published",
      repo_url: "https://github.com/acme/bus",
      demo_url: "https://bus.example",
    },
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/portfolio/metrics", () => {
  it("rejects GET and missing origin", async () => {
    expect((await GET()).status).toBe(405);
    const noOrigin = await POST(
      new Request("http://localhost:3000/api/portfolio/metrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "ada" }),
      })
    );
    expect(noOrigin.status).toBe(403);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("rejects bots, opt-out, and viewer ids in the body", async () => {
    const bot = await POST(post({ username: "ada" }, { "user-agent": "Googlebot/2.1" }));
    expect(bot.status).toBe(204);
    const gpc = await POST(post({ username: "ada" }, { "sec-gpc": "1" }));
    expect(gpc.status).toBe(204);
    const injected = await POST(post({ username: "ada", viewerId: "attacker" }));
    expect(injected.status).toBe(400);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("records a public view from the session viewer, never the body", async () => {
    const res = await POST(post({ username: "ada" }));
    expect(res.status).toBe(204);
    expect(adminRpc).toHaveBeenCalledWith(
      "record_portfolio_daily_metric_once",
      expect.objectContaining({
        p_kind: "view",
        p_owner_id: "owner-1",
        p_project_id: null,
        p_viewer_id: "viewer-1",
      })
    );
    const args = adminRpc.mock.calls[0][1] as { p_session_hash: string };
    expect(args.p_session_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("resolves a stored repo URL and does not accept a redirect target", async () => {
    const res = await POST(
      post({
        projectId: "11111111-1111-4111-8111-111111111111",
        clickKind: "repo",
      })
    );
    expect(res.status).toBe(204);
    expect(adminRpc).toHaveBeenCalledWith(
      "record_portfolio_daily_metric_once",
      expect.objectContaining({
        p_kind: "click",
        p_project_id: "11111111-1111-4111-8111-111111111111",
        p_owner_id: "owner-1",
      })
    );
  });

  it("does not increment owner, private, or unpublished destinations", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    const owner = await POST(post({ username: "ada" }));
    expect(owner.status).toBe(204);
    expect(adminRpc).not.toHaveBeenCalled();

    getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } } });
    rpc.mockResolvedValue({
      data: [{ owner_id: "owner-1", username: "ada", is_private: true, publish_intro: true }],
      error: null,
    });
    const priv = await POST(post({ username: "ada" }));
    expect(priv.status).toBe(204);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("is unavailable when the signing secret is missing", async () => {
    vi.stubEnv("PORTFOLIO_METRICS_SECRET", "");
    const res = await POST(post({ username: "ada" }));
    expect(res.status).toBe(503);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("rejects an oversized body and a malformed session cookie without throwing", async () => {
    const huge = await POST(
      new Request("http://localhost:3000/api/portfolio/metrics", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "content-length": "4000",
        },
        body: `{"username":"${"a".repeat(3500)}"}`,
      })
    );
    expect(huge.status).toBe(400);
    const badCookie = await POST(
      post({ username: "ada" }, { cookie: "sh_pf_sid=%E0%A4%A" })
    );
    expect(badCookie.status).toBe(204);
    expect(adminRpc).toHaveBeenCalled();
  });
});
