import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Worst case: fetch + one upsert batch + one stale-mark query, well under a minute.
export const maxDuration = 60;

const SIMPLIFY_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";
const MAX_ROWS = 2000;
const STALE_DAYS = 7;

type SimplifyRow = {
  id?: string;
  company_name?: string;
  title?: string;
  locations?: string[];
  terms?: string[];
  url?: string;
  active?: boolean;
  date_posted?: number;
  is_visible?: boolean;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rows: SimplifyRow[];
  try {
    const res = await fetch(SIMPLIFY_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error("expected array");
    rows = json;
  } catch (err) {
    console.error("jobs-ingest: fetch/parse failed", err);
    return NextResponse.json({ error: "Could not fetch listings" }, { status: 500 });
  }

  if (rows.length > MAX_ROWS) {
    console.error(`jobs-ingest: source returned ${rows.length} rows, capping at ${MAX_ROWS}`);
  }
  const batch = rows.slice(0, MAX_ROWS);

  let skipped = 0;
  const now = new Date().toISOString();
  const upsertRows = [];
  for (const r of batch) {
    const active = Boolean(r.active) && Boolean(r.is_visible);
    if (!active) continue;
    if (!r.id || !r.company_name || !r.title || !r.url) {
      skipped++;
      continue;
    }
    upsertRows.push({
      source: "simplify",
      external_id: r.id,
      org: r.company_name,
      title: r.title,
      kind: "internship",
      locations: (r.locations ?? []).join(", ").slice(0, 120) || null,
      term: (r.terms ?? []).join(", ").slice(0, 40) || null,
      url: r.url,
      posted_at: r.date_posted ? new Date(r.date_posted * 1000).toISOString() : null,
      active: true,
      last_seen_at: now,
    });
  }

  const admin = createAdminClient();
  let upserted = 0;
  if (upsertRows.length > 0) {
    const { error } = await admin
      .from("job_listings")
      .upsert(upsertRows, { onConflict: "source,external_id" });
    if (error) {
      console.error("jobs-ingest: upsert failed", error);
      return NextResponse.json({ error: "Upsert failed" }, { status: 500 });
    }
    upserted = upsertRows.length;
  }

  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: deactivated, error: staleError } = await admin
    .from("job_listings")
    .update({ active: false })
    .eq("source", "simplify")
    .lt("last_seen_at", staleCutoff)
    .select("id");
  if (staleError) {
    console.error("jobs-ingest: stale-mark failed", staleError);
    return NextResponse.json({ error: "Stale-mark failed" }, { status: 500 });
  }

  return NextResponse.json({
    fetched: rows.length,
    upserted,
    skipped,
    deactivated: deactivated?.length ?? 0,
  });
}
