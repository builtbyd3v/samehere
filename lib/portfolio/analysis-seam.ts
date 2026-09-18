import type { PortfolioProject } from "@/types/portfolio";

/** Fields written only by the github-analysis worker. Manual CRUD never sets them. */
export const ANALYSIS_SOURCE_FIELDS = [
  "source_repository_id",
  "source_commit_sha",
  "source_analysis_id",
] as const;

export function hasAnalysisSource(
  project: Pick<PortfolioProject, "source_analysis_id" | "source_repository_id">
): boolean {
  return project.source_analysis_id != null || project.source_repository_id != null;
}

export function stripSourceFields<T extends Record<string, unknown>>(input: T): Omit<T, (typeof ANALYSIS_SOURCE_FIELDS)[number]> {
  const next = { ...input };
  for (const key of ANALYSIS_SOURCE_FIELDS) {
    delete next[key];
  }
  return next;
}
