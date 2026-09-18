import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/portfolio/http";
import { githubAnalysisConfigured, githubOAuthConfigured, MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { OWNER_GITHUB_CONNECTION_COLUMNS } from "@/lib/github/contracts";
import { githubOwnerSeam } from "@/lib/github/seams";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const oauthAvailable = githubOAuthConfigured();
  const analysisAvailable = githubAnalysisConfigured();
  const { data, error } = await auth.client
    .from("github_connections")
    .select(OWNER_GITHUB_CONNECTION_COLUMNS)
    .eq("owner_id", auth.userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      {
        oauthAvailable,
        analysisAvailable,
        connection: null,
        manualProjectPath: MANUAL_PROJECT_PATH,
        seam: githubOwnerSeam(),
        error: "GitHub connection is unavailable. You can still add a project manually.",
      },
      { status: 503 }
    );
  }
  const status = data?.status;
  const connection =
    data && (status === "connected" || status === "reauthorization_needed")
      ? {
          id: data.id,
          owner_id: data.owner_id,
          github_user_id: data.github_user_id,
          github_login: data.github_login,
          epoch: data.epoch,
          status,
          connected_at: data.connected_at,
          last_synced_at: data.last_synced_at,
          last_sync_error: data.last_sync_error,
          last_error_at: data.last_error_at,
        }
      : null;
  return NextResponse.json({
    oauthAvailable,
    analysisAvailable,
    connection,
    manualProjectPath: MANUAL_PROJECT_PATH,
    seam: githubOwnerSeam(),
  });
}
