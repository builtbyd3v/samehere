import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---- Hoisted mock state (vi.mock factories run before imports) ----

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

const { GET } = await import("./route");

function buildRequest(auth?: string, query = "") {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request(`http://localhost/api/cron/weekly-digest${query}`, { headers }) as never;
}

const AUTH = "Bearer cron-test-secret";

const ROWS = [
  { user_id: "u1", email: "a@example.com", people: [{ username: "ada", display_name: "Ada", stage: "building" }], questions: [], views_7d: null },
  { user_id: "u2", email: "b@example.com", people: [], questions: [{ id: "p1", excerpt: "stuck on css", username: "bo", display_name: null }], views_7d: 3 },
  { user_id: "u3", email: "c@example.com", people: [], questions: [], views_7d: 0 },
];

function goLive() {
  vi.stubEnv("WEEKLY_DIGEST_ENABLED", "1");
  vi.stubEnv("RESEND_API_KEY", "test-key");
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
  vi.stubEnv("EMAIL_UNSUB_SECRET", "unsub-test-secret");
  vi.stubEnv("WEEKLY_DIGEST_ENABLED", undefined);
  vi.stubEnv("RESEND_API_KEY", undefined);
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: ROWS, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/weekly-digest auth guard", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret-xyz"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 and never calls the RPC when CRON_SECRET is unset (fail-closed)", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer undefined"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/weekly-digest dry run", () => {
  it("is a dry run when the flag is unset", async () => {
    const res = await GET(buildRequest(AUTH));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("list_weekly_digest");
    expect(await res.json()).toEqual({ dry: true, wouldSend: 2, empty: 1, total: 3 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("is a dry run when the flag is set but RESEND_API_KEY is not", async () => {
    vi.stubEnv("WEEKLY_DIGEST_ENABLED", "1");
    const res = await GET(buildRequest(AUTH));
    expect((await res.json()).dry).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("is a dry run on ?dry=1 even when live", async () => {
    goLive();
    const res = await GET(buildRequest(AUTH, "?dry=1"));
    const json = await res.json();
    expect(json.dry).toBe(true);
    expect(json.wouldSend).toBe(2);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("never puts emails or user ids in the dry response", async () => {
    const res = await GET(buildRequest(AUTH));
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("example.com");
    expect(body).not.toContain("u1");
  });
});

describe("GET /api/cron/weekly-digest live", () => {
  it("sends one email per non-empty row and skips the empty one", async () => {
    goLive();
    const res = await GET(buildRequest(AUTH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2, empty: 1, total: 3 });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com",
        from: "noreply@samehere.dev",
        headers: expect.objectContaining({ "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }),
      })
    );
    expect(sendEmailMock).not.toHaveBeenCalledWith(expect.objectContaining({ to: "c@example.com" }));
  });

  it("returns 500 and sends nothing when the RPC errors", async () => {
    goLive();
    rpcMock.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await GET(buildRequest(AUTH));
    expect(res.status).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
