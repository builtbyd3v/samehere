import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Fetch + upsert + stale-mark, plus a capped enrichment pass (company logos,
// ATS description snippets) that catches up across runs.
export const maxDuration = 300;

const SIMPLIFY_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";
const MAX_ROWS = 2000;
const STALE_DAYS = 7;
// Per-run enrichment budgets. Third-party fetches are the slow part; caps keep
// the cron well under maxDuration and spread backfill across runs.
const COMPANY_BUDGET = 60;
const DESC_BUDGET = 120;
const DESC_MAX = 1500;
const FETCH_TIMEOUT_MS = 8000;

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
  category?: string;
  sponsorship?: string;
  degrees?: string[];
  company_url?: string;
};

function timedFetch(url: string, init?: RequestInit) {
  return fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// All scraped text is third-party and untrusted: stored as plain text, rendered
// as plain text, and ⟦⟧-wrapped before any prompt use (lib/ai-prompts).
function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ATS public JSON APIs, matched by job URL host. Returns a plain-text snippet
// or null (unknown host / fetch failure — both fine, chips still render).
async function fetchDescription(jobUrl: string): Promise<string | null> {
  try {
    const u = new URL(jobUrl);
    let api: string | null = null;
    let pick: (j: unknown) => string | undefined = () => undefined;

    const gh = u.host.endsWith("greenhouse.io") && u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (gh) {
      api = `https://boards-api.greenhouse.io/v1/boards/${gh[1]}/jobs/${gh[2]}`;
      pick = (j) => (j as { content?: string }).content;
    }
    const lever = u.host === "jobs.lever.co" && u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/);
    if (lever) {
      api = `https://api.lever.co/v0/postings/${lever[1]}/${lever[2]}`;
      pick = (j) =>
        (j as { descriptionPlain?: string }).descriptionPlain ??
        (j as { description?: string }).description;
    }
    const ashby = u.host === "jobs.ashbyhq.com" && u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/);
    if (ashby) {
      api = `https://api.ashbyhq.com/posting-api/job-board/${ashby[1]}?includeCompensation=false`;
      pick = (j) => {
        const jobs = (j as { jobs?: { id?: string; descriptionPlain?: string; descriptionHtml?: string }[] }).jobs;
        const hit = jobs?.find((x) => x.id === ashby[2]);
        return hit?.descriptionPlain ?? hit?.descriptionHtml;
      };
    }
    if (!api) return null;

    const res = await timedFetch(api);
    if (!res.ok) return null;
    const raw = pick(await res.json());
    if (!raw) return null;
    return stripHtml(raw).slice(0, DESC_MAX) || null;
  } catch {
    return null;
  }
}

// simplify.jobs/c/<slug> embeds the company logo (simplify-imgs bucket) and a
// one-line description in its og/company URL. Client-rendered page, but both
// appear in the raw HTML. Regex scrape; misses store enriched_at anyway so a
// broken slug isn't retried every run.
async function fetchCompany(slug: string): Promise<{ logo_url: string | null; description: string | null }> {
  try {
    const res = await timedFetch(`https://simplify.jobs/c/${encodeURIComponent(slug)}`);
    if (!res.ok) return { logo_url: null, description: null };
    const html = await res.text();
    const logo =
      html.match(/https:\/\/storage\.googleapis\.com\/simplify-imgs\/companies\/[0-9a-f-]+\/logo\.\w+/)?.[0] ?? null;
    const desc = html.match(/[?&]description=([^&"]+)/)?.[1] ?? null;
    return {
      logo_url: logo,
      description: desc ? decodeURIComponent(desc.replace(/&amp;/g, "&")).slice(0, 300) : null,
    };
  } catch {
    return { logo_url: null, description: null };
  }
}

function companySlug(companyUrl: string | undefined): string | null {
  const m = companyUrl?.match(/simplify\.jobs\/c\/([^/?#]+)/);
  return m ? m[1] : null;
}

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

  // Filter BEFORE capping — the feed is append-ordered, so its head is years
  // of inactive rows and a pre-filter cap would ingest almost nothing.
  const live = rows.filter((r) => Boolean(r.active) && Boolean(r.is_visible));
  if (live.length > MAX_ROWS) {
    console.error(`jobs-ingest: source returned ${live.length} active rows, capping at ${MAX_ROWS}`);
  }
  const batch = live.slice(0, MAX_ROWS);

  let skipped = 0;
  const now = new Date().toISOString();
  const upsertRows = [];
  for (const r of batch) {
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
      category: r.category?.slice(0, 40) || null,
      sponsorship: r.sponsorship?.slice(0, 60) || null,
      degrees: (r.degrees ?? []).join(", ").slice(0, 80) || null,
      company_slug: companySlug(r.company_url),
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

  // ---- Enrichment pass 1: companies without a cache row (logo + blurb) ----
  const seenSlugs = [...new Set(upsertRows.map((r) => r.company_slug).filter((s): s is string => !!s))];
  const slugToName = new Map(upsertRows.filter((r) => r.company_slug).map((r) => [r.company_slug as string, r.org]));
  const { data: cachedCompanies } = await admin.from("job_companies").select("slug").in("slug", seenSlugs);
  const known = new Set((cachedCompanies ?? []).map((c) => c.slug));
  const todoCompanies = seenSlugs.filter((s) => !known.has(s)).slice(0, COMPANY_BUDGET);

  let companiesEnriched = 0;
  for (const slug of todoCompanies) {
    const { logo_url, description } = await fetchCompany(slug);
    const { error } = await admin.from("job_companies").upsert({
      slug,
      name: slugToName.get(slug) ?? slug,
      logo_url,
      description,
      enriched_at: now,
    });
    if (!error) companiesEnriched++;
  }

  // ---- Enrichment pass 2: active listings missing a description snippet ----
  const { data: needDesc } = await admin
    .from("job_listings")
    .select("id, url")
    .eq("active", true)
    .is("description", null)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(DESC_BUDGET);

  let descsFetched = 0;
  let descsMissing = 0;
  for (const l of needDesc ?? []) {
    const description = await fetchDescription(l.url);
    if (description) {
      const { error } = await admin.from("job_listings").update({ description }).eq("id", l.id);
      if (!error) descsFetched++;
    } else {
      // Unsupported host or dead posting: mark with empty string so it's not
      // re-fetched every run (UI treats '' as no description).
      await admin.from("job_listings").update({ description: "" }).eq("id", l.id);
      descsMissing++;
    }
  }

  return NextResponse.json({
    fetched: rows.length,
    upserted,
    skipped,
    deactivated: deactivated?.length ?? 0,
    companiesEnriched,
    companiesPending: Math.max(0, seenSlugs.length - known.size - todoCompanies.length),
    descsFetched,
    descsMissing,
  });
}
