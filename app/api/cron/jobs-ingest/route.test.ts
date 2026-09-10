import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { GET } = await import("./route");

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/jobs-ingest", { headers }) as never;
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/jobs-ingest", () => {
  it("returns 401 without the Bearer header", async () => {
    expect((await GET(buildRequest())).status).toBe(401);
  });

  it("returns 410 and does not fetch listings when authorized", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ disabled: true });
  });
});
