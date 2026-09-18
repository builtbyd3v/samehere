import { randomUUID } from "node:crypto";
import type { GithubAdminClient } from "@/lib/github/admin";
import { isGithubCredentialsKeyError } from "@/lib/github/config";
import { GithubHttpError } from "@/lib/github/http";
import { resolvePublicRepoById } from "@/lib/github/repos";
import { cryptoFromEnv } from "@/lib/github/store";
import { accessTokenForConnection } from "@/lib/github/tokens";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";
import type { AnalysisDraft } from "@/types/portfolio";
import { ANALYSIS_UNAVAILABLE } from "./errors";
import { extractPublicRepository, type AnalysisCoverage } from "./extract";
import { generateAnalysisDraft } from "./generate";
import { LEASE_TTL_SECONDS, MIN_MODEL_BUDGET_MS, PROCESSOR_DEADLINE_MS } from "./limits";
import { mapAnalysisRow, OWNER_ANALYSIS_SELECT } from "./status";

export type ProcessorDeps = {
  admin: GithubAdminClient;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  workerId?: string;
  deadlineMs?: number;
  extract?: typeof extractPublicRepository;
  generate?: typeof generateAnalysisDraft;
  resolve?: typeof resolvePublicRepoById;
  tokenFor?: typeof accessTokenForConnection;
};

class DeadlineError extends Error {
  constructor() {
    super("deadline");
  }
}

export async function loadAnalysis(admin: GithubAdminClient, analysisId: string) {
  const result = await admin.from("repository_analyses").select(OWNER_ANALYSIS_SELECT).eq("id", analysisId).maybeSingle();
  if (result.error || !result.data) return null;
  return mapAnalysisRow(result.data);
}

export async function processRepositoryAnalysis(analysisId: string, deps: ProcessorDeps): Promise<void> {
  const now = deps.now ?? (() => new Date());
  const started = now().getTime();
  const deadlineMs = deps.deadlineMs ?? PROCESSOR_DEADLINE_MS;
  const workerId = deps.workerId ?? randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  const pastDeadline = () => now().getTime() - started >= deadlineMs || controller.signal.aborted;
  const remainingMs = () => Math.max(0, deadlineMs - (now().getTime() - started));
  const assertLive = () => {
    if (pastDeadline()) {
      controller.abort();
      throw new DeadlineError();
    }
  };

  try {
    const row = await loadAnalysis(deps.admin, analysisId);
    if (!row || row.status === "succeeded" || row.status === "failed" || row.status === "cancelled") return;

    let attemptId = row.attempt_id;
    try {
      const leased = await deps.admin.rpc("acquire_repository_analysis_lease", {
        p_analysis_id: analysisId,
        p_worker_id: workerId,
        p_ttl_seconds: LEASE_TTL_SECONDS,
      });
      if (leased.error) throw new Error(leased.error.message || "acquire_repository_analysis_lease");
      const leaseRow = Array.isArray(leased.data) ? leased.data[0] : leased.data;
      if (leaseRow && typeof leaseRow === "object" && "attempt_id" in leaseRow) {
        attemptId = String(leaseRow.attempt_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes(PORTFOLIO_RPC_ERRORS.leaseExpired) || message.includes(PORTFOLIO_RPC_ERRORS.leaseHeld)) return;
      throw error;
    }

    const heartbeat = async () => {
      assertLive();
      const result = await deps.admin.rpc("heartbeat_repository_analysis_lease", {
        p_analysis_id: analysisId,
        p_attempt_id: attemptId,
        p_worker_id: workerId,
        p_ttl_seconds: LEASE_TTL_SECONDS,
      });
      if (result.error) throw new Error(result.error.message || "heartbeat_repository_analysis_lease");
    };

    const finalize = async (input: {
      status: "succeeded" | "failed" | "cancelled";
      draft?: AnalysisDraft;
      evidence?: AnalysisDraft["evidence"];
      coverage?: AnalysisCoverage;
      safeError?: string;
      model?: string;
      tokenInput?: number;
      tokenOutput?: number;
      estimatedCostUsd?: number;
    }) => {
      assertLive();
      const result = await deps.admin.rpc("finalize_repository_analysis", {
        p_analysis_id: analysisId,
        p_attempt_id: attemptId,
        p_worker_id: workerId,
        p_connection_epoch: row.connection_epoch,
        p_status: input.status,
        p_draft: input.draft,
        p_evidence: input.evidence,
        p_coverage: input.coverage,
        p_safe_error: input.safeError,
        p_model: input.model,
        p_prompt_version: row.prompt_version,
        p_token_input: input.tokenInput,
        p_token_output: input.tokenOutput,
        p_estimated_cost_usd: input.estimatedCostUsd,
      });
      if (result.error) throw new Error(result.error.message || "finalize_repository_analysis");
    };

    const fail = async (
      safeError: string,
      usage?: { model?: string; tokenInput?: number; tokenOutput?: number; estimatedCostUsd?: number }
    ) => {
      await finalize({
        status: "failed",
        safeError,
        ...usage,
      });
    };

    const advance = async (status: "reading_repository" | "analyzing" | "saving_draft") => {
      assertLive();
      const result = await deps.admin.rpc("advance_repository_analysis_stage", {
        p_analysis_id: analysisId,
        p_attempt_id: attemptId,
        p_worker_id: workerId,
        p_connection_epoch: row.connection_epoch,
        p_status: status,
      });
      if (result.error) throw new Error(result.error.message || "advance_repository_analysis_stage");
    };

    try {
      await heartbeat();
      if (row.status === "queued") await advance("reading_repository");

      const connection = await deps.admin
        .from("github_connections")
        .select("id, owner_id, github_user_id, github_login, epoch, status")
        .eq("id", row.connection_id)
        .maybeSingle();
      const conn = connection.data;
      if (!conn || conn.status !== "connected" || conn.epoch !== row.connection_epoch) {
        await fail("GitHub connection is not active.");
        return;
      }
      if (!row.model) {
        await fail(ANALYSIS_UNAVAILABLE);
        return;
      }

      assertLive();
      const live = deps.tokenFor
        ? await deps.tokenFor(deps.admin, {
            connectionId: conn.id,
            ownerId: conn.owner_id,
            epoch: conn.epoch,
            login: conn.github_login,
            githubUserId: conn.github_user_id,
            key: Buffer.alloc(32),
            keyVersion: 1,
            signal: controller.signal,
            fetchImpl: deps.fetchImpl,
          })
        : await accessTokenForConnection(deps.admin, {
            connectionId: conn.id,
            ownerId: conn.owner_id,
            epoch: conn.epoch,
            login: conn.github_login,
            githubUserId: conn.github_user_id,
            ...cryptoFromEnv(),
            signal: controller.signal,
            fetchImpl: deps.fetchImpl,
          });

      await heartbeat();
      const resolved = await (deps.resolve ?? resolvePublicRepoById)({
        token: live.accessToken,
        repositoryId: row.repository_id,
        commitSha: row.commit_sha,
        signal: controller.signal,
        fetchImpl: deps.fetchImpl,
      });
      const pinned = { ...resolved, commitSha: row.commit_sha };

      const extracted = await (deps.extract ?? extractPublicRepository)({
        token: live.accessToken,
        repo: pinned,
        signal: controller.signal,
        remainingMs,
        fetchImpl: deps.fetchImpl,
      });
      if (controller.signal.aborted) return;

      await heartbeat();
      await advance("analyzing");

      assertLive();
      if (remainingMs() < MIN_MODEL_BUDGET_MS) throw new DeadlineError();
      const generated = await (deps.generate ?? generateAnalysisDraft)({
        files: extracted.files,
        coverage: extracted.coverage,
        repo: { fullName: pinned.fullName, commitSha: pinned.commitSha, fork: pinned.fork },
        model: row.model,
        signal: controller.signal,
        timeoutMs: remainingMs(),
      });
      if (controller.signal.aborted) return;

      await heartbeat();
      await advance("saving_draft");
      if (controller.signal.aborted) return;

      if (!generated.ok) {
        await fail(generated.error, {
          model: generated.usage.model,
          tokenInput: generated.usage.tokenInput ?? undefined,
          tokenOutput: generated.usage.tokenOutput ?? undefined,
          estimatedCostUsd: generated.usage.estimatedCostUsd ?? undefined,
        });
        return;
      }

      await heartbeat();
      await finalize({
        status: "succeeded",
        draft: generated.draft,
        evidence: generated.draft.evidence,
        coverage: extracted.coverage,
        model: generated.usage.model,
        tokenInput: generated.usage.tokenInput ?? undefined,
        tokenOutput: generated.usage.tokenOutput ?? undefined,
        estimatedCostUsd: generated.usage.estimatedCostUsd ?? undefined,
      });
    } catch (error) {
      if (error instanceof DeadlineError || controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes(PORTFOLIO_RPC_ERRORS.leaseExpired) ||
        message.includes(PORTFOLIO_RPC_ERRORS.staleAttempt) ||
        message.includes(PORTFOLIO_RPC_ERRORS.staleEpoch)
      ) {
        return;
      }
      if (isGithubCredentialsKeyError(error)) {
        try {
          await fail(ANALYSIS_UNAVAILABLE);
        } catch (inner) {
          if (inner instanceof DeadlineError || controller.signal.aborted) return;
          throw inner;
        }
        return;
      }
      if (error instanceof GithubHttpError && error.kind === "reauth") {
        await fail("GitHub needs to be reconnected.");
        return;
      }
      if (message.includes("not public") || (error instanceof GithubHttpError && error.kind === "not_found")) {
        await fail("That repository is not public or is not available to this GitHub account.");
        return;
      }
      try {
        await fail("Analysis could not be completed.");
      } catch (inner) {
        if (inner instanceof DeadlineError || controller.signal.aborted) return;
        throw inner;
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
