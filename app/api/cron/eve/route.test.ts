import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const {
  signInWithPasswordMock,
  signOutMock,
  generateTextMock,
  fromMock,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  generateTextMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
    },
    from: fromMock,
  }),
}));

vi.mock("@/lib/ai", () => ({
  generateText: generateTextMock,
}));

const { GET } = await import("./route");

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/eve", { headers }) as never;
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
  // Default: Eve bot env unset → skipped path when auth passes.
  vi.stubEnv("EVE_BOT_EMAIL", undefined);
  vi.stubEnv("EVE_BOT_PASSWORD", undefined);

  signInWithPasswordMock.mockReset();
  signOutMock.mockReset();
  generateTextMock.mockReset();
  fromMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
  generateTextMock.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/eve — auth guard", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 and never signs in when CRON_SECRET is unset (fail-closed)", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer undefined"));
    expect(res.status).toBe(401);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the header is a different length than expected", async () => {
    const res = await GET(buildRequest("Bearer short"));
    expect(res.status).toBe(401);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns 200 { skipped: true } when CRON auth is valid but Eve env is unset", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ skipped: true });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });
});
