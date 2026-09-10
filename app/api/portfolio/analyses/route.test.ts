import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
const maybeSingle = vi.fn();
const generate = vi.fn();
const process = vi.fn();
const pin = vi.fn(async () => {});
const afterFn = vi.fn<(cb: () => unknown) => void>((cb) => {
  void cb();
});
const tokenFor = vi.fn();
const resolveRepo = vi.fn();

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: afterFn };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
          order: () => ({
            limit: () => ({ maybeSingle }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  }),
}));

vi.mock("@/lib/repository-analysis/generate", () => ({
  generateAnalysisDraft: generate,
}));

vi.mock("@/lib/repository-analysis/schedule", () => ({
  runAnalysisProcessor: process,
  pinReservedAnalysisModel: pin,
}));

vi.mock("@/lib/github/tokens", () => ({
  accessTokenForConnection: (...args: unknown[]) => tokenFor(...args),
}));

vi.mock("@/lib/github/repos", () => ({
  resolvePublicRepoById: (...args: unknown[]) => resolveRepo(...args),
}));

const { GET, POST, maxDuration } = await import("./route");

const LATEST_ROW = {
  id: "a1",
  owner_id: "owner-1",
  project_id: null,
  connection_id: "c1",
  connection_epoch: 1,
  repository_id: 99,
  repository_full_name: "ada/bus",
  commit_sha: "a".repeat(40),
  request_key: "k",
  prompt_version: "repo-analysis-v1",
  status: "queued",
  attempt_id: "t1",
  parent_analysis_id: null,
  parent_attempt_id: null,
  lease_owner: null,
  lease_expires_at: null,
  draft: null,
  evidence: null,
  coverage: null,
  model: "claude-haiku-4-5",
  token_input: null,
  token_output: null,
  estimated_cost_usd: null,
  safe_error: null,
  created_at: "2099-01-01T00:00:00Z",
  started_at: null,
  updated_at: "2099-01-01T00:00:00Z",
  completed_at: null,
};

function stubValidGithub() {
  vi.stubEnv("GITHUB_CREDENTIALS_KEY", "a".repeat(64));
  maybeSingle.mockResolvedValue({
    data: {
      id: "c1",
      owner_id: "owner-1",
      github_user_id: 1,
      github_login: "ada",
      epoch: 1,
      status: "connected",
    },
    error: null,
  });
  tokenFor.mockResolvedValue({ accessToken: "gho_x" });
  resolveRepo.mockResolvedValue({
    id: 99,
    name: "bus",
    fullName: "ada/bus",
    fork: false,
    defaultBranch: "main",
    commitSha: "a".repeat(40),
  });
}

beforeEach(() => {
  getUser.mockReset();
  rpc.mockReset();
  maybeSingle.mockReset();
  generate.mockReset();
  process.mockReset();
  pin.mockReset();
  afterFn.mockClear();
  tokenFor.mockReset();
  resolveRepo.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
  vi.stubEnv("GITHUB_CLIENT_ID", "id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "secret");
  vi.stubEnv("GITHUB_OAUTH_CALLBACK_URL", "https://samehere.dev/api/integrations/github/callback");
  vi.stubEnv("GITHUB_CREDENTIALS_KEY", "not-valid-key");
  vi.stubEnv("OPENAI_API_KEY", "k");
  vi.stubEnv("OPENAI_MODEL", "claude-haiku-4-5");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/portfolio/analyses", () => {
  it("exports a literal maxDuration of 120", () => {
    expect(maxDuration).toBe(120);
  });

  it("returns unavailable for a malformed credentials key and does not reserve", async () => {
    const res = await POST(
      new Request("http://localhost/api/portfolio/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: 99 }),
      })
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; manualProjectPath: string };
    expect(body.error).toMatch(/unavailable/i);
    expect(body.manualProjectPath).toBe("/profile/projects/new");
    expect(rpc).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects an oversized body before reserve", async () => {
    stubValidGithub();
    const res = await POST(
      new Request("http://localhost/api/portfolio/analyses", {
        method: "POST",
        headers: { "content-length": "300" },
        body: "x".repeat(300),
      })
    );
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(pin).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
  });

  it("pins the reserved model before scheduling the processor", async () => {
    stubValidGithub();
    rpc.mockResolvedValue({
      data: [{ analysis_id: "a1", reused: false, status: "queued", request_key: "k", attempt_id: "t1" }],
      error: null,
    });
    const res = await POST(
      new Request("http://localhost/api/portfolio/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: 99 }),
      })
    );
    expect(res.status).toBe(201);
    expect(pin).toHaveBeenCalledWith(expect.anything(), "a1", "claude-haiku-4-5");
    expect(afterFn).toHaveBeenCalled();
    expect(process).toHaveBeenCalledWith("a1");
    expect(pin.mock.invocationCallOrder[0]).toBeLessThan(afterFn.mock.invocationCallOrder[0]);
  });

  it("does not overwrite the model or reschedule a reused row", async () => {
    stubValidGithub();
    rpc.mockResolvedValue({
      data: [{ analysis_id: "a1", reused: true, status: "queued", request_key: "k", attempt_id: "t1" }],
      error: null,
    });
    const res = await POST(
      new Request("http://localhost/api/portfolio/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: 99 }),
      })
    );
    expect(res.status).toBe(200);
    expect(pin).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
  });
});

describe("GET /api/portfolio/analyses", () => {
  it("returns the newest owner row for ?latest=1 and never runs the processor", async () => {
    maybeSingle.mockResolvedValue({ data: LATEST_ROW, error: null });
    const res = await GET(new Request("http://localhost/api/portfolio/analyses?latest=1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { analysis: { id: string } | null; presentation: { kind: string } | null };
    expect(body.analysis?.id).toBe("a1");
    expect(body.presentation?.kind).toBe("queued");
    expect(process).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    expect(pin).not.toHaveBeenCalled();
  });

  it("rejects collection GET without latest=1", async () => {
    const res = await GET(new Request("http://localhost/api/portfolio/analyses"));
    expect(res.status).toBe(400);
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
  });
});
