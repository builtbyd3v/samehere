import { afterEach, describe, expect, it, vi } from "vitest";
import { githubAdminForTest } from "@/lib/github/admin";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";
import { processRepositoryAnalysis } from "./processor";

const RESERVED_SHA = "b".repeat(40);

type RpcResult = { data: unknown; error: { message?: string } | null };
type RpcFn = (args?: Record<string, unknown>) => Promise<RpcResult>;

const ANALYSIS = {
  id: "a1",
  owner_id: "o1",
  project_id: null,
  connection_id: "c1",
  connection_epoch: 4,
  repository_id: 99,
  repository_full_name: "ignored/name",
  commit_sha: RESERVED_SHA,
  request_key: "k",
  prompt_version: "repo-analysis-v1",
  status: "queued",
  attempt_id: "t1",
  parent_analysis_id: null,
  parent_attempt_id: null,
  lease_owner: null,
  lease_expires_at: "2099-01-01T00:00:00Z",
  draft: null,
  evidence: null,
  coverage: null,
  model: "claude-haiku-4-5",
  token_input: null,
  token_output: null,
  estimated_cost_usd: null,
  safe_error: null,
  created_at: "2026-09-10T11:00:00Z",
  started_at: null,
  updated_at: "2026-09-10T11:00:00Z",
  completed_at: null,
};

function createAdmin(options: {
  analysis?: typeof ANALYSIS;
  rpcs?: Record<string, RpcFn>;
}) {
  const rpcs = options.rpcs ?? {};
  const analysis = options.analysis ?? ANALYSIS;
  const chain = {
    _table: "",
    select() {
      return this;
    },
    eq() {
      return this;
    },
    insert() {
      throw new Error("no project insert");
    },
    update() {
      throw new Error("no analysis project_id patch");
    },
    maybeSingle: async () => {
      if (chain._table === "repository_analyses") return { data: analysis, error: null };
      if (chain._table === "github_connections") {
        return {
          data: { id: "c1", owner_id: "o1", github_user_id: 42, github_login: "ada", epoch: 4, status: "connected" },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
  return githubAdminForTest({
    rpc: async (name, args) => {
      const handler = rpcs[name];
      if (handler) return handler(args);
      if (name === "acquire_repository_analysis_lease") {
        return { data: [{ analysis_id: "a1", attempt_id: "t1", lease_expires_at: "2099-01-01T00:00:00Z" }], error: null };
      }
      return { data: null, error: null };
    },
    from(table) {
      chain._table = table;
      return chain;
    },
  });
}

const resolvedHead = {
  id: 99,
  name: "bus",
  fullName: "ada/bus",
  fork: false,
  defaultBranch: "main",
  commitSha: "a".repeat(40),
};

const liveToken = {
  accessToken: "gho_x",
  connectionId: "c1",
  ownerId: "o1",
  epoch: 4,
  login: "ada",
  githubUserId: 42,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("processRepositoryAnalysis", () => {
  it("finalizes failure with p_prompt_version and does not invent a draft", async () => {
    const finalize = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = createAdmin({ rpcs: { finalize_repository_analysis: finalize } });
    await processRepositoryAnalysis("a1", {
      admin,
      tokenFor: async () => liveToken,
      resolve: async (input) => ({ ...resolvedHead, commitSha: input.commitSha ?? resolvedHead.commitSha }),
      extract: async ({ repo }) => ({
        repo,
        files: [{ path: "README.md", text: "# Bus", bytes: 5 }],
        coverage: {
          repositoryId: 99,
          fullName: "ada/bus",
          commitSha: repo.commitSha,
          defaultBranch: "main",
          fork: false,
          filesRead: 1,
          fileLimit: 30,
          bytesRead: 5,
          byteLimit: 200000,
          sampledPaths: ["README.md"],
          skippedPaths: [],
          partial: false,
          partialReasons: [],
        },
      }),
      generate: async () => ({
        ok: false,
        error: "The analysis draft failed validation.",
        usage: { model: "claude-haiku-4-5", tokenInput: 10, tokenOutput: 4, estimatedCostUsd: null, costKind: "unknown" },
      }),
    });
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        p_status: "failed",
        p_safe_error: "The analysis draft failed validation.",
        p_prompt_version: "repo-analysis-v1",
        p_token_input: 10,
      })
    );
    expect(finalize.mock.calls[0][0]?.p_draft ?? null).toBeNull();
  });

  it("pins extract and finalize to the reserved SHA", async () => {
    const finalize = vi.fn<RpcFn>(async () => ({ data: "p1", error: null }));
    const admin = createAdmin({ rpcs: { finalize_repository_analysis: finalize } });
    let extractSha = "";
    await processRepositoryAnalysis("a1", {
      admin,
      tokenFor: async () => liveToken,
      resolve: async (input) => {
        expect(input.commitSha).toBe(RESERVED_SHA);
        return { ...resolvedHead, commitSha: input.commitSha ?? resolvedHead.commitSha };
      },
      extract: async ({ repo }) => {
        extractSha = repo.commitSha;
        return {
          repo,
          files: [{ path: "README.md", text: "# Bus", bytes: 5 }],
          coverage: {
            repositoryId: 99,
            fullName: "ada/bus",
            commitSha: repo.commitSha,
            defaultBranch: "main",
            fork: false,
            filesRead: 1,
            fileLimit: 30,
            bytesRead: 5,
            byteLimit: 200000,
            sampledPaths: ["README.md"],
            skippedPaths: [],
            partial: false,
            partialReasons: [],
          },
        };
      },
      generate: async (input) => ({
        ok: true,
        draft: {
          title: "Bus",
          summary: "",
          description: "",
          technologies: [],
          keyFeatures: [],
          uncertaintyNotes: [],
          evidence: [{ path: "README.md", excerpt: "Bus" }],
        },
        usage: { model: input.model, tokenInput: 1, tokenOutput: 1, estimatedCostUsd: null, costKind: "unknown" },
      }),
    });
    expect(extractSha).toBe(RESERVED_SHA);
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        p_status: "succeeded",
        p_prompt_version: "repo-analysis-v1",
      })
    );
    expect(finalize.mock.calls[0][0]?.p_coverage).toMatchObject({ commitSha: RESERVED_SHA });
  });

  it("does not finalize when the worker is stale", async () => {
    const finalize = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = createAdmin({
      rpcs: {
        advance_repository_analysis_stage: vi.fn<RpcFn>(async () => ({
          data: null,
          error: { message: PORTFOLIO_RPC_ERRORS.staleAttempt },
        })),
        finalize_repository_analysis: finalize,
      },
    });
    await processRepositoryAnalysis("a1", {
      admin,
      tokenFor: async () => liveToken,
    });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("does not finalize late output after the 90s deadline", async () => {
    const finalize = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = createAdmin({ rpcs: { finalize_repository_analysis: finalize } });
    let now = 0;
    await processRepositoryAnalysis("a1", {
      admin,
      now: () => new Date(now),
      deadlineMs: 90_000,
      tokenFor: async () => {
        now = 91_000;
        return liveToken;
      },
      resolve: async () => resolvedHead,
    });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("aborts in-flight extract when the wall-clock deadline fires", async () => {
    vi.useFakeTimers();
    const finalize = vi.fn<RpcFn>(async () => ({ data: null, error: null }));
    const admin = createAdmin({ rpcs: { finalize_repository_analysis: finalize } });
    let sawAbort = false;
    let enteredExtract!: () => void;
    const entered = new Promise<void>((resolve) => {
      enteredExtract = resolve;
    });
    const done = processRepositoryAnalysis("a1", {
      admin,
      deadlineMs: 90_000,
      tokenFor: async () => liveToken,
      resolve: async () => ({ ...resolvedHead, commitSha: RESERVED_SHA }),
      extract: async ({ signal }): Promise<never> => {
        enteredExtract();
        if (signal?.aborted) {
          sawAbort = true;
          throw new DOMException("aborted", "AbortError");
        }
        return await new Promise<never>((_, reject) => {
          signal?.addEventListener("abort", () => {
            sawAbort = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      },
    });
    await entered;
    await vi.advanceTimersByTimeAsync(90_000);
    await done;
    expect(sawAbort).toBe(true);
    expect(finalize).not.toHaveBeenCalled();
  });
});
