import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import { AppEmptyState, AppPage, AppPageHeader } from "@/components/app/AppPrimitives";
import { IconGraduationCap, IconPin } from "@/components/icons";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MatchesSection from "./MatchesSection";
import FilterForm from "./FilterForm";
import PitchButton from "./PitchButton";
import SaveJobButton from "@/components/jobs/SaveJobButton";
import type { JobFitResult } from "./actions";
import { relAge, isNew } from "./format";
import AvatarBase from "@/components/ui/Avatar";

const PAGE = 30;

// SimplifyJobs feed category values.
const CATEGORIES = ["Software", "Data Science", "AI & Machine Learning", "Quant", "Hardware", "Product", "Other"];
const SPONSORSHIPS = ["Offers Sponsorship", "Does Not Offer Sponsorship", "U.S. Citizenship is Required"];

// Shared filter-bar control style: uniform height + focus treatment.
const CONTROL =
  "h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

type ListingRow = {
  id: string;
  org: string;
  title: string;
  kind: string;
  locations: string | null;
  term: string | null;
  url: string;
  posted_at: string | null;
  category: string | null;
  sponsorship: string | null;
  company_slug: string | null;
  degrees: string | null;
  description: string | null;
};

function CompanyLogo({ org, logoUrl }: { org: string; logoUrl: string | null | undefined }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)] object-contain bg-white p-1"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return <AvatarBase seed={org} name={org} className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)] text-sm" />;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    kind?: string;
    q?: string;
    location?: string;
    category?: string;
    sponsorship?: string;
    sort?: string;
    saved?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const kind = params.kind === "internship" || params.kind === "new_grad" ? params.kind : "";
  const q = (params.q ?? "").trim().slice(0, TEXT_LIMITS.searchQuery);
  const location = (params.location ?? "").trim().slice(0, 60);
  const category = CATEGORIES.includes(params.category ?? "") ? (params.category as string) : "";
  const sponsorship = SPONSORSHIPS.includes(params.sponsorship ?? "") ? (params.sponsorship as string) : "";
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const savedOnly = params.saved === "1";

  const { supabase, user } = await getViewer();

  // Saved-listing ids for the viewer: needed both to filter the board (when
  // savedOnly is on) and to seed every SaveJobButton's initial state (avoids
  // a per-row query / a save-then-refresh flash of the wrong icon).
  let savedIds: Set<string> = new Set();
  if (user) {
    const { data: saves } = await supabase.from("job_saves").select("listing_id").eq("user_id", user.id);
    savedIds = new Set((saves ?? []).map((s) => s.listing_id));
  }
  // savedOnly with zero saves: skip the query entirely -- .in("id", []) is
  // invalid PostgREST syntax (empty IN list), and the answer is always "no
  // rows" anyway.
  const savedOnlyEmpty = savedOnly && savedIds.size === 0;

  let query = supabase
    .from("job_listings")
    .select(
      "id, org, title, kind, locations, term, url, posted_at, category, sponsorship, company_slug, degrees, description",
      { count: "exact" }
    )
    .eq("active", true)
    .order("posted_at", { ascending: sort === "oldest", nullsFirst: false })
    .order("id", { ascending: false });

  if (savedOnly) query = query.in("id", [...savedIds]);
  if (kind) query = query.eq("kind", kind);
  if (location) {
    // Strip ilike wildcards + PostgREST-significant chars before interpolating.
    const term = location.replace(/[%_,()*\\]/g, "");
    if (term) query = query.ilike("locations", `%${term}%`);
  }
  if (category) query = query.eq("category", category);
  if (sponsorship) query = query.eq("sponsorship", sponsorship);
  if (q) {
    // Sanitize to [a-z0-9 ] tokens (mirrors lib/people-search.ts) so nothing
    // escapes the PostgREST .or() filter grammar.
    const tokens = q
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/gi, ""))
      .filter(Boolean)
      .slice(0, 8);
    if (tokens.length) {
      const orFilter = tokens.flatMap((t) => [`org.ilike.%${t}%`, `title.ilike.%${t}%`]).join(",");
      query = query.or(orFilter);
    }
  }

  const from = (page - 1) * PAGE;
  // one extra row -> hasMore; count: "exact" rides on the same query (no second query).
  const { data, count } = savedOnlyEmpty
    ? { data: [] as ListingRow[], count: 0 }
    : await query.range(from, from + PAGE).returns<ListingRow[]>();
  const rows = data ?? [];
  const hasMore = rows.length > PAGE;
  const listings = rows.slice(0, PAGE);
  const total = count ?? listings.length;

  // Company logos: one batched lookup for every distinct slug on the page.
  const slugs = [...new Set(listings.map((l) => l.company_slug).filter((s): s is string => !!s))];
  let logoBySlug = new Map<string, string | null>();
  if (slugs.length) {
    const { data: companies } = await supabase.from("job_companies").select("slug, logo_url").in("slug", slugs);
    logoBySlug = new Map((companies ?? []).map((c) => [c.slug, c.logo_url]));
  }

  // Cached fit results (from a prior "Find my matches" run) render on load,
  // no AI call. Joined listing data is re-selected fresh; inactive listings
  // are excluded here (job_fit rows persist until the user re-ranks).
  let initialResults: JobFitResult[] = [];
  if (user) {
    const { data: fits } = await supabase
      .from("job_fit")
      .select(
        "listing_id, reason, listing:job_listings!inner(id, org, title, kind, locations, term, url, posted_at, category, sponsorship, company_slug, degrees, description)"
      )
      .eq("user_id", user.id)
      .eq("listing.active", true)
      .order("created_at", { ascending: false })
      .returns<{ listing_id: string; reason: string; listing: ListingRow | null }[]>();
    initialResults = (fits ?? [])
      .filter((f): f is typeof f & { listing: ListingRow } => f.listing !== null)
      .map((f) => ({ id: f.listing_id, reason: f.reason, listing: f.listing }));
  }
  const fitByListing = new Map(initialResults.map((result) => [result.id, result.reason]));

  const profile = user
    ? (await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single()).data
    : null;
  const pro = isPro(profile ?? { is_pro: false, pro_until: null });

  const filterHref = (next: { page?: number }) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (kind) sp.set("kind", kind);
    if (location) sp.set("location", location);
    if (category) sp.set("category", category);
    if (sponsorship) sp.set("sponsorship", sponsorship);
    if (sort !== "newest") sp.set("sort", sort);
    if (savedOnly) sp.set("saved", "1");
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const s = sp.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };
  const anyFilter = !!(q || kind || location || category || sponsorship || sort !== "newest" || savedOnly);

  return (
    <AppPage width="full">
      <AppPageHeader
        kicker="Apply"
        title="Opportunities"
        description="Target internships that fit your current proof, then track the ones worth your time."
      />

      <FilterForm
        q={q}
        location={location}
        kind={kind}
        category={category}
        sponsorship={sponsorship}
        sort={sort}
        saved={savedOnly}
        showSaved={!!user}
        categories={CATEGORIES}
        sponsorships={SPONSORSHIPS}
        anyFilter={anyFilter}
        maxQuery={TEXT_LIMITS.searchQuery}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0" aria-labelledby="opportunity-results">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="opportunity-results" className="text-sm font-medium text-[var(--ink)]">
              Current listings
            </h2>
            <p className="text-xs text-[var(--ink-faint)]">
              {total} result{total === 1 ? "" : "s"}
              {anyFilter ? " with filters" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
        {listings.length === 0 ? (
          <AppEmptyState
            title={savedOnly ? "No saved listings" : "No listings yet"}
            description={
              savedOnly
                ? "Save a listing from the board to find it here later."
                : "New internships and new-grad roles land here daily. Check back soon."
            }
          />
        ) : (
          listings.map((l, i) => {
            const location = l.locations ? l.locations.slice(0, 60) : null;
            const kindLabel = l.kind === "internship" ? "Internship" : "New grad";
            const degrees = l.degrees && l.degrees !== "N/A" ? l.degrees : null;
            const fitReason = fitByListing.get(l.id);
            const chips = [l.category, l.term, l.sponsorship]
              .filter((c): c is string => !!c && c !== "N/A" && c !== "Other")
              .map((c) => c.slice(0, 30))
              .filter((c, idx, a) => a.indexOf(c) === idx);
            return (
              <div
                key={l.id}
                className="cascade-up app-panel relative p-5 transition hover:-translate-y-[1px] hover:border-[var(--border-strong)]"
                style={{ "--delay": `${Math.min(i, 10) * 60}ms` } as React.CSSProperties}
              >
                {/* Stretched title link keeps the whole row navigable while actions
                    remain interactive above it. */}
                <div className="flex items-start gap-3">
                  <CompanyLogo org={l.org} logoUrl={l.company_slug ? logoBySlug.get(l.company_slug) : null} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/jobs/${l.id}`}
                        className='text-[15px] font-semibold leading-tight text-[var(--ink)] after:absolute after:inset-0 after:content-[""]'
                      >
                        {l.title}
                      </Link>
                      {isNew(l.posted_at) && (
                        <span className="rounded-full bg-[var(--blue-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--blue)]">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--ink-muted)]">
                      <span className="font-medium text-[var(--ink)]">{l.org}</span>
                      {location && (
                        <>
                          <span aria-hidden className="text-[var(--ink-faint)]">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <IconPin className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                            {location}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
                      {kindLabel}
                      {l.posted_at ? ` · posted ${relAge(l.posted_at)}` : ""}
                    </p>
                  </div>
                </div>

                {(chips.length > 0 || degrees) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full bg-[var(--featured-surface)] px-2.5 py-1 text-[12px] text-[var(--ink-muted)]"
                      >
                        {c}
                      </span>
                    ))}
                    {degrees && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--featured-surface)] px-2.5 py-1 text-[12px] text-[var(--ink-muted)]">
                        <IconGraduationCap className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                        {degrees}
                      </span>
                    )}
                  </div>
                )}

                {fitReason ? (
                  <div className="mt-3 border-l-2 border-[var(--accent-blue)] pl-3">
                    <p className="text-[11px] font-medium text-[var(--accent-blue-strong)]">
                      AI fit
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {fitReason}
                    </p>
                  </div>
                ) : null}

                <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    Apply
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5.5 3.5h7v7M12.5 3.5 4 12" />
                    </svg>
                  </a>
                  {user && <SaveJobButton listingId={l.id} initialSaved={savedIds.has(l.id)} compact />}
                  {user && <PitchButton listingId={l.id} pro={pro} block />}
                </div>
              </div>
            );
          })
        )}
          </div>

          {(page > 1 || hasMore) && (
            <div className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={filterHref({ page: page - 1 })} className="text-[var(--ink-muted)] underline">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {hasMore && (
                <Link href={filterHref({ page: page + 1 })} className="text-[var(--ink-muted)] underline">
                  Next
                </Link>
              )}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20">
          <MatchesSection initialResults={initialResults} pro={pro} />
        </aside>
      </div>
    </AppPage>
  );
}
