import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { GET } = await import("./route");

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/eve", { headers }) as never;
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/eve", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer undefined"));
    expect(res.status).toBe(401);
  });

  it("returns 410 and never signs in when authorized", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ disabled: true });
  });
});
