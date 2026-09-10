import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const generate = vi.fn();
const process = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/repository-analysis/generate", () => ({
  generateAnalysisDraft: generate,
}));

vi.mock("@/lib/repository-analysis/processor", () => ({
  processRepositoryAnalysis: process,
}));

const { GET } = await import("./route");

beforeEach(() => {
  getUser.mockReset();
  maybeSingle.mockReset();
  generate.mockReset();
  process.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/portfolio/analyses/[id]", () => {
  it("reads persisted state only and never calls the model", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "a1",
        owner_id: "owner-1",
        project_id: null,
        connection_id: "c1",
        connection_epoch: 1,
        repository_id: 9,
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
        model: null,
        token_input: null,
        token_output: null,
        estimated_cost_usd: null,
        safe_error: null,
        created_at: "2099-01-01T00:00:00Z",
        started_at: null,
        updated_at: "2099-01-01T00:00:00Z",
        completed_at: null,
      },
      error: null,
    });
    const res = await GET(new Request("http://localhost/api/portfolio/analyses/a1"), { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { presentation: { kind: string } };
    expect(body.presentation.kind).toBe("queued");
    expect(generate).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
  });
});
