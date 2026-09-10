import type { GithubAdminClient } from "@/lib/github/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { processRepositoryAnalysis } from "./processor";

export async function pinReservedAnalysisModel(
  admin: GithubAdminClient,
  analysisId: string,
  model: string
): Promise<void> {
  const result = await admin.from("repository_analyses").update({ model }).eq("id", analysisId);
  if (result.error) throw new Error(result.error.message || "Could not pin analysis model.");
}

export async function runAnalysisProcessor(analysisId: string): Promise<void> {
  await processRepositoryAnalysis(analysisId, { admin: createAdminClient() });
}
