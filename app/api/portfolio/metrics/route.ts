import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPortfolioSchemaMissing } from "@/lib/portfolio/errors";
import {
  METRICS_SESSION_COOKIE,
  METRICS_SESSION_TTL_SECONDS,
  abuseRateKey,
  eligiblePublicView,
  hasRenderedPublicContent,
  isBotUserAgent,
  metricsSecret,
  newMetricSessionId,
  parseMetricBody,
  readCappedJson,
  readMetricSessionCookie,
  requestHost,
  requestPrivacyOptOut,
  resolveClickUrl,
  sameOriginRequest,
  sessionHash,
  signMetricSession,
  takeMetricRateSlot,
  trustedClientIp,
  verifyMetricSession,
} from "@/lib/portfolio/metrics";

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

type PublicPortfolioRow = {
  owner_id: string;
  username: string;
  is_private: boolean;
  publish_intro?: boolean;
  publish_projects?: boolean;
  publish_experience?: boolean;
  publish_education?: boolean;
  publish_posts?: boolean;
  activity_visible?: boolean;
};

type MetricOnceArgs = Database["public"]["Functions"]["record_portfolio_daily_metric_once"]["Args"];

function withSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: METRICS_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: METRICS_SESSION_TTL_SECONDS,
  });
  return response;
}

function empty(status = 204): NextResponse {
  return new NextResponse(null, { status });
}

export async function POST(request: Request) {
  const secret = metricsSecret();
  if (!secret) return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  if (!sameOriginRequest(request, requestHost(request))) return empty(403);
  if (requestPrivacyOptOut(request) || isBotUserAgent(request.headers.get("user-agent"))) {
    return empty();
  }

  const body = await readCappedJson(request);
  if (body === undefined) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  const event = parseMetricBody(body);
  if (!event) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  const cookieToken = readMetricSessionCookie(request.headers.get("cookie") ?? "");
  const existing = verifyMetricSession(cookieToken, secret, nowSeconds);
  const session = existing ?? {
    id: newMetricSessionId(),
    exp: nowSeconds + METRICS_SESSION_TTL_SECONDS,
  };
  const token = existing && cookieToken ? cookieToken : signMetricSession(session.id, session.exp, secret);
  const hash = sessionHash(session.id);
  // Session bucket plus HMAC(IP, window). New cookies cannot bypass the abuse bucket.
  // Per-process Map; multi-instance is best-effort and does not imply unique people.
  if (!takeMetricRateSlot(abuseRateKey(secret, trustedClientIp(request.headers), nowMs), nowMs)) {
    return withSessionCookie(empty(), token);
  }
  if (!takeMetricRateSlot(hash, nowMs)) return withSessionCookie(empty(), token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  try {
    const admin = createAdminClient();
    if (event.kind === "view") {
      const { data, error } = await supabase.rpc("get_public_portfolio", { p_username: event.username });
      if (error) {
        if (isPortfolioSchemaMissing(error)) {
          return NextResponse.json({ error: "Unavailable." }, { status: 503 });
        }
        return withSessionCookie(empty(), token);
      }
      const row = (data?.[0] ?? null) as PublicPortfolioRow | null;
      if (
        !row ||
        !eligiblePublicView({
          isOwner: viewerId === row.owner_id,
          previewPublic: false,
          isPrivate: row.is_private,
          isBlocked: false,
          isSuspended: false,
          hasRenderedPublicContent: hasRenderedPublicContent(row),
        })
      ) {
        return withSessionCookie(empty(), token);
      }
      await recordOnce(admin, {
        p_owner_id: row.owner_id,
        p_project_id: null,
        p_kind: "view",
        p_viewer_id: viewerId,
        p_session_hash: hash,
      });
      return withSessionCookie(empty(), token);
    }

    const { data: project, error: projectError } = await admin
      .from("portfolio_projects")
      .select("id, owner_id, status, repo_url, demo_url")
      .eq("id", event.projectId)
      .maybeSingle();
    if (projectError) {
      if (isPortfolioSchemaMissing(projectError)) {
        return NextResponse.json({ error: "Unavailable." }, { status: 503 });
      }
      return withSessionCookie(empty(), token);
    }
    if (
      !project ||
      project.status !== "published" ||
      viewerId === project.owner_id ||
      !resolveClickUrl(project, event.clickKind)
    ) {
      return withSessionCookie(empty(), token);
    }
    await recordOnce(admin, {
      p_owner_id: project.owner_id,
      p_project_id: project.id,
      p_kind: "click",
      p_viewer_id: viewerId,
      p_session_hash: hash,
    });
    return withSessionCookie(empty(), token);
  } catch {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
}

async function recordOnce(
  admin: ReturnType<typeof createAdminClient>,
  args: MetricOnceArgs
) {
  const { error } = await admin.rpc("record_portfolio_daily_metric_once", args);
  if (error && isPortfolioSchemaMissing(error)) {
    throw new Error("unavailable");
  }
}
