import type { SupabaseClient } from "@supabase/supabase-js";

/** Same cap as job-detail peers rail. */
export const HOME_HELPERS_LIMIT = 6;

export const HELP_KINDS = ["internship", "job", "research"] as const;

export type HomeHelper = {
  username: string;
  /** Real display_name, else username — never invented. */
  name: string;
  org: string;
  note: string;
  href: string;
};

/** Company keys used to match experiences (slug preferred, org ilike fallback). */
export type HelperCompanySource = {
  org: string;
  company_slug?: string | null;
};

type ExpRow = {
  user_id: string;
  org: string;
  role: string;
  term: string | null;
  kind: string;
  company_slug: string | null;
};

/** Strip PostgREST filter metacharacters (mirrors job detail). */
export function sanitizeOrgFilter(org: string): string {
  return org.replace(/[,()%*]/g, "").trim();
}

export function companiesFromListings(
  listings: readonly { org: string; company_slug?: string | null }[],
): HelperCompanySource[] {
  const out: HelperCompanySource[] = [];
  const seen = new Set<string>();
  for (const row of listings) {
    const org = row.org?.trim();
    if (!org) continue;
    const slug = row.company_slug?.trim() || null;
    const key = (slug ?? org).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ org, company_slug: slug });
  }
  return out.slice(0, 12);
}

/** Intake target names → org-only sources (no slug until resolved). */
export function companiesFromTargetNames(names: readonly string[]): HelperCompanySource[] {
  const out: HelperCompanySource[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const org = raw.trim();
    if (!org) continue;
    const key = org.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ org, company_slug: null });
  }
  return out.slice(0, 12);
}

/**
 * Resolve company sources for home helpers.
 * Prefer intake target_companies; if empty/unavailable, use opportunity
 * listings already shown on home (slug + org).
 */
export function resolveHelperCompanies(input: {
  targetCompanies?: readonly string[] | null;
  listings?: readonly { org: string; company_slug?: string | null }[] | null;
}): HelperCompanySource[] {
  const fromIntake = companiesFromTargetNames(input.targetCompanies ?? []);
  if (fromIntake.length) return fromIntake;
  return companiesFromListings(input.listings ?? []);
}

function helperNote(role: string, term: string | null): string {
  return [role, term].filter(Boolean).join(" · ");
}

/**
 * Opt-in helpers for adaptive home — same privacy rules as /jobs/[id]:
 * experiences.kind in internship|job|research, profiles.open_to_help=true,
 * exclude self + blocked, prefer company_slug then org ilike, cap results,
 * link to /messages?to=username. Soft-empty on schema/query failure.
 */
export async function loadHomeHelpers(
  supabase: SupabaseClient,
  userId: string,
  companies: readonly HelperCompanySource[],
  limit = HOME_HELPERS_LIMIT,
): Promise<HomeHelper[]> {
  if (!companies.length || limit <= 0) return [];

  const slugs = [
    ...new Set(
      companies
        .map((c) => c.company_slug?.trim())
        .filter((s): s is string => !!s),
    ),
  ];
  const orgs = [
    ...new Set(
      companies
        .map((c) => sanitizeOrgFilter(c.org))
        .filter((o) => o.length > 0),
    ),
  ];
  if (!slugs.length && !orgs.length) return [];

  const expSelect = "user_id, org, role, term, kind, company_slug";
  const [{ data: blocked }, slugRes, ...ilikeResults] = await Promise.all([
    supabase.rpc("get_blocked_ids"),
    slugs.length
      ? supabase
          .from("experiences")
          .select(expSelect)
          .in("company_slug", slugs)
          .in("kind", [...HELP_KINDS])
          .order("created_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: null as ExpRow[] | null, error: null }),
    ...orgs.map((orgSafe) =>
      supabase
        .from("experiences")
        .select(expSelect)
        .ilike("org", orgSafe)
        .in("kind", [...HELP_KINDS])
        .order("created_at", { ascending: false })
        .limit(40),
    ),
  ]);

  const slugRows =
    !slugRes.error && slugRes.data?.length ? (slugRes.data as ExpRow[]) : [];
  const ilikeRows = ilikeResults.flatMap((res) =>
    !res.error && res.data?.length ? (res.data as ExpRow[]) : [],
  );
  // Prefer slug rows, then fill with org ilike (covers listings missing slugs).
  const expRows = slugRows.length ? [...slugRows, ...ilikeRows] : ilikeRows;
  if (!expRows.length) return [];

  const blockedSet = new Set((blocked ?? []) as string[]);
  const byUser = new Map<string, { org: string; role: string; term: string | null }>();
  for (const e of expRows) {
    if (blockedSet.has(e.user_id) || e.user_id === userId || byUser.has(e.user_id)) {
      continue;
    }
    byUser.set(e.user_id, { org: e.org, role: e.role, term: e.term });
  }
  const peerIds = [...byUser.keys()].slice(0, limit * 3);
  if (!peerIds.length) return [];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, open_to_help")
    .in("id", peerIds)
    .eq("open_to_help", true);

  if (profErr || !profiles?.length) return [];

  return profiles
    .filter((p) => byUser.has(p.id) && !!p.username)
    .slice(0, limit)
    .map((p) => {
      const exp = byUser.get(p.id)!;
      const username = p.username;
      return {
        username,
        name: p.display_name?.trim() || username,
        org: exp.org,
        note: helperNote(exp.role, exp.term),
        href: `/messages?to=${encodeURIComponent(username)}`,
      };
    });
}

/** Soft-read intake answers.target_companies (no full IntakeAnswers parse). */
export function targetCompaniesFromAnswersJson(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const value = (raw as Record<string, unknown>).target_companies;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 80))
    .slice(0, 12);
}
