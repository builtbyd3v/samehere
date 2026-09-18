import { NextResponse } from "next/server";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { fail } from "@/lib/portfolio/errors";
import { classifyAnalysisRpc } from "@/lib/repository-analysis/errors";
import { mapAnalysisRow, OWNER_ANALYSIS_SELECT, presentAnalysis } from "@/lib/repository-analysis/status";
import { analysisSeam } from "@/lib/repository-analysis/seams";
import { MANUAL_PROJECT_PATH } from "@/lib/github/config";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id) return resultResponse(fail("Invalid input.", 400));

  const { data, error } = await auth.client
    .from("repository_analyses")
    .select(OWNER_ANALYSIS_SELECT)
    .eq("id", id)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (error) return resultResponse(classifyAnalysisRpc(error));
  if (!data) return resultResponse(fail("Analysis not found.", 404));

  const row = mapAnalysisRow(data);
  return NextResponse.json({
    analysis: row,
    presentation: presentAnalysis(row),
    seam: analysisSeam(row.id, row.project_id),
    manualProjectPath: MANUAL_PROJECT_PATH,
  });
}
