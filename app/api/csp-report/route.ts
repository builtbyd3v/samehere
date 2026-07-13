import { type NextRequest } from "next/server";

// Browser-sent CSP violation collector. Report-Only policy (next.config.ts)
// points here via `report-uri` + the `Reporting-Endpoints` header's
// `report-to`. No auth — browsers POST this unauthenticated, proxy.ts /
// lib/supabase/middleware.ts allowlists the path. Never 500s: a malformed or
// oversized body just means no violation gets logged, not a broken request.
const MAX_BODY_BYTES = 16 * 1024;

function truncate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, 200);
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 204 });
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 204 });
    }

    const parsed: unknown = JSON.parse(rawBody);

    // Two shapes reach this endpoint: legacy `application/csp-report`
    // (`{ "csp-report": {...} }`) via report-uri, and the newer Reporting
    // API `application/reports+json` (an array of `{ body: {...} }`).
    const reports = Array.isArray(parsed) ? parsed : [parsed];

    for (const entry of reports) {
      if (typeof entry !== "object" || entry === null) continue;
      const record = entry as Record<string, unknown>;
      const cspReport =
        (record["csp-report"] as Record<string, unknown> | undefined) ??
        (record["body"] as Record<string, unknown> | undefined) ??
        record;

      console.warn("csp-violation", {
        directive: truncate(
          cspReport["violated-directive"] ?? cspReport["violatedDirective"] ?? cspReport["effectiveDirective"]
        ),
        blockedURI: truncate(cspReport["blocked-uri"] ?? cspReport["blockedURL"]),
        documentURI: truncate(cspReport["document-uri"] ?? cspReport["documentURL"]),
      });
    }
  } catch {
    // Bad JSON / unexpected shape — never surface an error to the reporting browser.
  }

  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response(null, { status: 405 });
}
