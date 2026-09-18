import { after } from "next/server";
import { NextResponse } from "next/server";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { fail } from "@/lib/portfolio/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  githubAnalysisConfigured,
  githubAnalysisModel,
  githubOAuthConfigured,
  MANUAL_PROJECT_PATH,
} from "@/lib/github/config";
import { OWNER_GITHUB_CONNECTION_COLUMNS } from "@/lib/github/contracts";
import { tryCryptoFromEnv } from "@/lib/github/store";
import { accessTokenForConnection } from "@/lib/github/tokens";
import { resolvePublicRepoById } from "@/lib/github/repos";
import { GithubHttpError } from "@/lib/github/http";
import { ANALYSIS_PROMPT_VERSION } from "@/lib/repository-analysis/limits";
import { requestKeyFor } from "@/lib/repository-analysis/extract";
import { classifyAnalysisRpc, ANALYSIS_UNAVAILABLE } from "@/lib/repository-analysis/errors";
import { pinReservedAnalysisModel, runAnalysisProcessor } from "@/lib/repository-analysis/schedule";
import { analysisSeam } from "@/lib/repository-analysis/seams";
import { readCappedJson } from "@/lib/repository-analysis/read-capped-json";
import { mapAnalysisRow, OWNER_ANALYSIS_SELECT, presentAnalysis } from "@/lib/repository-analysis/status";
import type { Database } from "@/types/database.types";
import type { ReserveRepositoryAnalysisResult } from "@/types/portfolio";

export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (new URL(request.url).searchParams.get("latest") !== "1") {
    return resultResponse(fail("Invalid input.", 400));
  }
  const { data, error } = await auth.client
    .from("repository_analyses")
    .select(OWNER_ANALYSIS_SELECT)
    .eq("owner_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return resultResponse(classifyAnalysisRpc(error));
  if (!data) {
    return NextResponse.json({
      analysis: null,
      presentation: null,
      seam: null,
      manualProjectPath: MANUAL_PROJECT_PATH,
    });
  }
  const row = mapAnalysisRow(data);
  return NextResponse.json({
    analysis: row,
    presentation: presentAnalysis(row),
    seam: analysisSeam(row.id, row.project_id),
    manualProjectPath: MANUAL_PROJECT_PATH,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  if (!githubOAuthConfigured() || !githubAnalysisConfigured()) {
    return NextResponse.json({ error: ANALYSIS_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const frozenModel = githubAnalysisModel();
  if (!frozenModel) {
    return NextResponse.json({ error: ANALYSIS_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }
  const crypto = tryCryptoFromEnv();
  if (!crypto.ok) {
    return NextResponse.json({ error: ANALYSIS_UNAVAILABLE, manualProjectPath: MANUAL_PROJECT_PATH }, { status: 503 });
  }

  const body = await readCappedJson(request);
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return resultResponse(fail("Invalid input.", 400));
  }
  const raw = body as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (keys.length !== 1 || keys[0] !== "repositoryId") {
    return resultResponse(fail("Invalid input.", 400));
  }
  const repositoryId = raw.repositoryId;
  if (typeof repositoryId !== "number" || !Number.isInteger(repositoryId) || repositoryId <= 0) {
    return resultResponse(fail("Invalid input.", 400));
  }

  const { data: connection, error: connectionError } = await auth.client
    .from("github_connections")
    .select(OWNER_GITHUB_CONNECTION_COLUMNS)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (connectionError || !connection || connection.status !== "connected") {
    return NextResponse.json(
      { error: "Connect GitHub before analyzing a repository.", manualProjectPath: MANUAL_PROJECT_PATH },
      { status: 409 }
    );
  }

  const admin = createAdminClient();
  let resolved;
  try {
    const live = await accessTokenForConnection(admin, {
      connectionId: connection.id,
      ownerId: connection.owner_id,
      epoch: connection.epoch,
      login: connection.github_login,
      githubUserId: connection.github_user_id,
      key: crypto.key,
      keyVersion: crypto.keyVersion,
    });
    resolved = await resolvePublicRepoById({ token: live.accessToken, repositoryId });
  } catch (caught) {
    if (caught instanceof GithubHttpError && caught.kind === "reauth") {
      return NextResponse.json({ error: "GitHub needs to be reconnected." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "That repository is not public or is not available to this GitHub account.", manualProjectPath: MANUAL_PROJECT_PATH },
      { status: 409 }
    );
  }

  const reserveArgs: Database["public"]["Functions"]["reserve_repository_analysis"]["Args"] = {
    p_project_id: null,
    p_repository_id: resolved.id,
    p_repository_full_name: resolved.fullName,
    p_commit_sha: resolved.commitSha,
    p_request_key: requestKeyFor(resolved.id, resolved.commitSha, ANALYSIS_PROMPT_VERSION),
    p_prompt_version: ANALYSIS_PROMPT_VERSION,
  };
  const reserved = await auth.client.rpc("reserve_repository_analysis", reserveArgs);
  if (reserved.error) return resultResponse(classifyAnalysisRpc(reserved.error));
  const row = (Array.isArray(reserved.data) ? reserved.data[0] : reserved.data) as ReserveRepositoryAnalysisResult | undefined;
  if (!row) return resultResponse(fail("Could not start analysis.", 500));
  if (!row.reused && row.status === "queued") {
    try {
      await pinReservedAnalysisModel(admin, row.analysis_id, frozenModel);
    } catch {
      return resultResponse(fail("Could not start analysis.", 500));
    }
    after(() => runAnalysisProcessor(row.analysis_id));
  }
  return NextResponse.json(row, { status: row.reused ? 200 : 201 });
}
