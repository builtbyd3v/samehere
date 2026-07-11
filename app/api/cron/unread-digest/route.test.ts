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

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/unread-digest", { headers }) as never;
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
  vi.stubEnv("EMAIL_UNSUB_SECRET", "unsub-test-secret");
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/unread-digest — auth guard", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with the correct Bearer header", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("list_unread_digest_recipients");
  });

  it("returns 401 and never calls the RPC when CRON_SECRET is unset (fail-closed)", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer undefined"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the header is a different length than expected", async () => {
    const res = await GET(buildRequest("Bearer short"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/unread-digest — sends per recipient", () => {
  it("emails every recipient the RPC returns", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { user_id: "u1", email: "a@example.com", dm_unread: 2, notif_unread: 0 },
        { user_id: "u2", email: "b@example.com", dm_unread: 0, notif_unread: 3 },
      ],
      error: null,
    });

    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@example.com", from: "noreply@samehere.dev" })
    );
  });

  it("returns 500 when the RPC errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
