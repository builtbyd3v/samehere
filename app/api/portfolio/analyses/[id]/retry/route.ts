import { after } from "next/server";
import { NextResponse } from "next/server";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { fail } from "@/lib/portfolio/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { githubAnalysisConfigured, githubAnalysisModel, githubOAuthConfigured, MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { classifyAnalysisRpc, ANALYSIS_UNAVAILABLE } from "@/lib/repository-analysis/errors";
import { pinReservedAnalysisModel, runAnalysisProcessor } from "@/lib/repository-analysis/schedule";
import type { Database } from "@/types/database.types";
import type { ReserveRepositoryAnalysisResult } from "@/types/portfolio";

export const maxDuration = 120;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (!githubOAuthConfigured() || !githubAnalysisConfigured()) {
    return NextResponse.json({ error: ANALYSIS_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const frozenModel = githubAnalysisModel();
  if (!frozenModel || !tryCryptoFromEnv().ok) {
    return NextResponse.json({ error: ANALYSIS_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const { id } = await context.params;
  if (!id) return resultResponse(fail("Invalid input.", 400));

  const retryArgs: Database["public"]["Functions"]["retry_repository_analysis"]["Args"] = {
    p_analysis_id: id,
  };
  const retried = await auth.client.rpc("retry_repository_analysis", retryArgs);
  if (retried.error) return resultResponse(classifyAnalysisRpc(retried.error));
  const row = (Array.isArray(retried.data) ? retried.data[0] : retried.data) as ReserveRepositoryAnalysisResult | undefined;
  if (!row) return resultResponse(fail("Could not retry analysis.", 500));
  if (!row.reused && row.status === "queued") {
    try {
      await pinReservedAnalysisModel(createAdminClient(), row.analysis_id, frozenModel);
    } catch {
      return resultResponse(fail("Could not retry analysis.", 500));
    }
    after(() => runAnalysisProcessor(row.analysis_id));
  }
  return NextResponse.json(row, { status: row.reused ? 200 : 201 });
}
