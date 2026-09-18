import { NextResponse } from "next/server";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { fail } from "@/lib/portfolio/errors";
import { classifyAnalysisRpc } from "@/lib/repository-analysis/errors";
import { cancelCopy } from "@/lib/repository-analysis/status";
import type { Database } from "@/types/database.types";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id) return resultResponse(fail("Invalid input.", 400));

  const cancelArgs: Database["public"]["Functions"]["cancel_repository_analysis"]["Args"] = {
    p_analysis_id: id,
  };
  const cancelled = await auth.client.rpc("cancel_repository_analysis", cancelArgs);
  if (cancelled.error) return resultResponse(classifyAnalysisRpc(cancelled.error));
  return NextResponse.json({ ok: true, message: cancelCopy() });
}
