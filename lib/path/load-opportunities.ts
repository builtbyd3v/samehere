import type { SupabaseClient } from "@supabase/supabase-js";

export type OpportunityListing = {
  id: string;
  org: string;
  title: string;
  location?: string | null;
  company_slug?: string | null;
  fit?: string | null;
};

export type ApplicationStageCount = {
  label: string;
  count: number;
};

const STATUS_LABELS: Record<string, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  oa: "OA",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// Pipeline summary on path home — skip terminal statuses unless they have rows.
const HOME_STATUSES = ["wishlist", "applied", "oa", "interview", "offer"] as const;

type ListingCore = {
  id: string;
  org: string;
  title: string;
  locations: string | null;
  company_slug: string | null;
};

function mapListing(
  row: ListingCore,
  fit?: string | null,
): OpportunityListing {
  return {
    id: row.id,
    org: row.org,
    title: row.title,
    location: row.locations,
    company_slug: row.company_slug,
    fit: fit ?? null,
  };
}

async function loadFromFit(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<OpportunityListing[]> {
  const { data, error } = await supabase
    .from("job_fit")
    .select(
      "reason, listing:job_listings!inner(id, org, title, locations, company_slug, active)",
    )
    .eq("user_id", userId)
    .eq("listing.active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      {
        reason: string;
        listing: ListingCore & { active: boolean };
      }[]
    >();

  if (error || !data?.length) return [];
  return data.map((row) => mapListing(row.listing, row.reason));
}

async function loadFromSaves(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<OpportunityListing[]> {
  const { data, error } = await supabase
    .from("job_saves")
    .select(
      "listing:job_listings!inner(id, org, title, locations, company_slug, active)",
    )
    .eq("user_id", userId)
    .eq("listing.active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<{ listing: ListingCore & { active: boolean } }[]>();

  if (error || !data?.length) return [];
  return data.map((row) => mapListing(row.listing, "Saved"));
}

async function loadLatestInternships(
  supabase: SupabaseClient,
  limit: number,
): Promise<OpportunityListing[]> {
  const { data, error } = await supabase
    .from("job_listings")
    .select("id, org, title, locations, company_slug")
    .eq("active", true)
    .eq("kind", "internship")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit)
    .returns<ListingCore[]>();

  if (error || !data?.length) return [];
  return data.map((row) => mapListing(row));
}

/**
 * Shortlist for path Opportunities: prefer job_fit, then saves, else latest
 * active internships. Empty array on failure so callers keep stub copy.
 */
export async function loadOpportunities(
  supabase: SupabaseClient,
  userId: string,
  limit = 5,
): Promise<OpportunityListing[]> {
  try {
    const fromFit = await loadFromFit(supabase, userId, limit);
    if (fromFit.length) return fromFit;

    const fromSaves = await loadFromSaves(supabase, userId, limit);
    if (fromSaves.length) return fromSaves;

    return await loadLatestInternships(supabase, limit);
  } catch {
    return [];
  }
}

/**
 * Counts by application status for path Applications module.
 * null on failure → recipe keeps stub copy.
 */
export async function loadApplicationStages(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApplicationStageCount[] | null> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("status")
      .eq("user_id", userId);

    if (error) return null;

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const status = row.status;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    const stages = HOME_STATUSES.map((status) => ({
      label: STATUS_LABELS[status] ?? status,
      count: counts.get(status) ?? 0,
    })).filter((s) => s.count > 0);

    // Query ok but empty board — show the core pipeline at zero so it reads live.
    if (stages.length === 0) {
      return (["wishlist", "applied", "interview"] as const).map((status) => ({
        label: STATUS_LABELS[status] ?? status,
        count: 0,
      }));
    }

    return stages;
  } catch {
    return null;
  }
}
