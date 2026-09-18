import type { Database } from "@/types/database.types";
import { ANALYSIS_QUOTA } from "@/types/portfolio";
import type { AnalysisDraft, AnalysisStatus, RepositoryAnalysis } from "@/types/portfolio";

type AnalysisRow = Database["public"]["Tables"]["repository_analyses"]["Row"];

export type AnalysisPresentation =
  | { kind: "queued" | "reading_repository" | "analyzing" | "saving_draft"; status: AnalysisStatus }
  | { kind: "interrupted"; status: AnalysisStatus; canRetry: true }
  | { kind: "succeeded"; status: "succeeded"; projectId: string | null; draft: AnalysisDraft | null }
  | { kind: "failed"; status: "failed"; safeError: string; canRetry: true }
  | { kind: "cancelled"; status: "cancelled"; canRetry: true; copy: string };

export function isLeaseExpired(
  row: Pick<RepositoryAnalysis, "lease_expires_at" | "status" | "created_at">,
  now = new Date()
): boolean {
  if (row.status === "succeeded" || row.status === "failed" || row.status === "cancelled") return false;
  if (row.lease_expires_at) return new Date(row.lease_expires_at).getTime() <= now.getTime();
  if (row.status === "queued") {
    return new Date(row.created_at).getTime() + ANALYSIS_QUOTA.queuedSeconds * 1000 <= now.getTime();
  }
  return true;
}

export function presentAnalysis(row: RepositoryAnalysis, now = new Date()): AnalysisPresentation {
  if (row.status === "succeeded") {
    return { kind: "succeeded", status: "succeeded", projectId: row.project_id, draft: row.draft };
  }
  if (row.status === "failed") {
    return { kind: "failed", status: "failed", safeError: row.safe_error ?? "Analysis failed.", canRetry: true };
  }
  if (row.status === "cancelled") {
    return { kind: "cancelled", status: "cancelled", canRetry: true, copy: cancelCopy() };
  }
  if (isLeaseExpired(row, now)) {
    return { kind: "interrupted", status: row.status, canRetry: true };
  }
  return { kind: row.status, status: row.status };
}

export function cancelCopy(): string {
  return "Draft creation stopped, nothing published. A provider request already in flight may still finish, but its output will be discarded.";
}

export const OWNER_ANALYSIS_SELECT =
  "id, owner_id, project_id, connection_id, connection_epoch, repository_id, repository_full_name, commit_sha, request_key, prompt_version, status, attempt_id, parent_analysis_id, parent_attempt_id, lease_owner, lease_expires_at, draft, evidence, coverage, model, token_input, token_output, estimated_cost_usd, safe_error, created_at, started_at, updated_at, completed_at" as const;

export function mapAnalysisRow(row: AnalysisRow): RepositoryAnalysis {
  return {
    id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    connection_epoch: row.connection_epoch,
    repository_id: row.repository_id,
    repository_full_name: row.repository_full_name,
    commit_sha: row.commit_sha,
    request_key: row.request_key,
    prompt_version: row.prompt_version,
    status: row.status as AnalysisStatus,
    attempt_id: row.attempt_id,
    parent_analysis_id: row.parent_analysis_id,
    parent_attempt_id: row.parent_attempt_id,
    lease_owner: row.lease_owner,
    lease_expires_at: row.lease_expires_at,
    draft: row.draft && typeof row.draft === "object" && !Array.isArray(row.draft) ? (row.draft as AnalysisDraft) : null,
    evidence: Array.isArray(row.evidence) ? (row.evidence as AnalysisDraft["evidence"]) : null,
    coverage: row.coverage && typeof row.coverage === "object" && !Array.isArray(row.coverage) ? (row.coverage as Record<string, unknown>) : null,
    model: row.model,
    token_input: row.token_input,
    token_output: row.token_output,
    estimated_cost_usd: row.estimated_cost_usd,
    safe_error: row.safe_error,
    created_at: row.created_at,
    started_at: row.started_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}
