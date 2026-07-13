import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import EmptyState from "@/components/ui/EmptyState";
import { IconBriefcase } from "@/components/icons";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MatchesSection from "./MatchesSection";
import FilterForm from "./FilterForm";
import PitchButton from "./PitchButton";
import type { JobFitResult } from "./actions";
import { relAge, isNew } from "./format";

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
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
      {org.charAt(0).toUpperCase()}
    </div>
  );
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

  const { supabase, user } = await getViewer();

  let query = supabase
    .from("job_listings")
    .select(
      "id, org, title, kind, locations, term, url, posted_at, category, sponsorship, company_slug, degrees, description",
      { count: "exact" }
    )
    .eq("active", true)
    .order("posted_at", { ascending: sort === "oldest", nullsFirst: false })
    .order("id", { ascending: false });

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
  const { data, count } = await query.range(from, from + PAGE).returns<ListingRow[]>();
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

  // "N students with a path here" chip: distinct user_id count in experiences
  // whose org ilike-matches this listing's org, batched into one query for the
  // whole page. ponytail: skips blocked-viewer filtering here (would need a
  // second per-viewer join) -- the chip is a rough social-proof signal, not a
  // privacy-sensitive list.
  const orgs = [...new Set(listings.map((l) => l.org))];
  let countByOrg = new Map<string, number>();
  if (orgs.length) {
    const orFilter = orgs.map((o) => `org.ilike.${o.replace(/[,()%*]/g, "")}`).join(",");
    const { data: expRows } = await supabase.from("experiences").select("user_id, org").or(orFilter).limit(1000);
    const usersByOrg = new Map<string, Set<string>>();
    for (const e of expRows ?? []) {
      const org = orgs.find((o) => e.org.toLowerCase() === o.toLowerCase()) ?? e.org;
      const set = usersByOrg.get(org) ?? new Set<string>();
      set.add(e.user_id);
      usersByOrg.set(org, set);
    }
    countByOrg = new Map([...usersByOrg].map(([org, set]) => [org, set.size]));
  }

  // Cached fit results (from a prior "Find my matches" run) render on load,
  // no AI call. Joined listing data is re-selected fresh so a listing that
  // went inactive since the last rank still shows current info (or drops
  // if the join fails).
  let initialResults: JobFitResult[] = [];
  if (user) {
    const { data: fits } = await supabase
      .from("job_fit")
      .select(
        "listing_id, reason, listing:job_listings(id, org, title, kind, locations, term, url, posted_at, category, sponsorship, company_slug, degrees, description)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<{ listing_id: string; reason: string; listing: ListingRow | null }[]>();
    initialResults = (fits ?? [])
      .filter((f): f is typeof f & { listing: ListingRow } => f.listing !== null)
      .map((f) => ({ id: f.listing_id, reason: f.reason, listing: f.listing }));
  }

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
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const s = sp.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };
  const anyFilter = !!(q || kind || location || category || sponsorship || sort !== "newest");

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <IconBriefcase className="h-5 w-5 text-[var(--blue)]" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Jobs</h1>
      </div>

      <MatchesSection initialResults={initialResults} pro={pro} />

      <FilterForm
        q={q}
        location={location}
        kind={kind}
        category={category}
        sponsorship={sponsorship}
        sort={sort}
        categories={CATEGORIES}
        sponsorships={SPONSORSHIPS}
        anyFilter={anyFilter}
        maxQuery={TEXT_LIMITS.searchQuery}
      />

      <p className="mt-4 text-xs text-[var(--ink-faint)]">
        {total} listing{total === 1 ? "" : "s"}
        {anyFilter ? " matching filters" : ""}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="New internships and new-grad roles land here daily. Check back soon."
          />
        ) : (
          listings.map((l, i) => {
            const studentCount = countByOrg.get(l.org) ?? 0;
            return (
              <div
                key={l.id}
                className="cascade-up relative rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper transition hover:-translate-y-[1px] hover:border-[var(--border-strong)]"
                style={{ "--delay": `${Math.min(i, 10) * 60}ms` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <CompanyLogo org={l.org} logoUrl={l.company_slug ? logoBySlug.get(l.company_slug) : null} />
                    <div className="min-w-0">
                      {/* Stretched link: makes the whole card click through to the detail
                          page while Apply/PitchButton/students-chip stay independently
                          clickable via relative z-10. */}
                      <Link
                        href={`/jobs/${l.id}`}
                        className='text-[15px] font-semibold text-[var(--ink)] after:absolute after:inset-0 after:content-[""]'
                      >
                        {l.title}
                      </Link>
                      {isNew(l.posted_at) && (
                        <span className="ml-2 inline-block rounded-full bg-[var(--blue-glow)] px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-[var(--blue)]">
                          New
                        </span>
                      )}
                      <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                        {l.org}
                        {l.locations ? ` · ${l.locations}` : ""}
                        {l.term && l.term !== "N/A" ? ` · ${l.term}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-faint)]">
                        {l.kind === "internship" ? "Internship" : "New grad"}
                        {l.posted_at ? ` · posted ${relAge(l.posted_at)}` : ""}
                      </p>
                      {(() => {
                        const rowChips = [l.category, l.sponsorship]
                          .filter((c): c is string => !!c && c !== "Other" && c !== "N/A")
                          .map((c) => c.slice(0, 30))
                          .filter((c, idx, a) => a.indexOf(c) === idx);
                        return rowChips.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {rowChips.map((c) => (
                              <span
                                key={c}
                                className="rounded-full bg-[var(--featured-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:opacity-80"
                    >
                      Apply
                    </a>
                    {user && <PitchButton listingId={l.id} pro={pro} />}
                  </div>
                </div>
                {studentCount > 0 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(l.org)}`}
                    className="relative z-10 mt-4 inline-block rounded-full bg-[var(--blue-glow)] px-2.5 py-1 text-xs font-medium text-[var(--blue)] transition hover:opacity-80"
                  >
                    {studentCount} student{studentCount === 1 ? "" : "s"} with a path here
                  </Link>
                )}
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
    </main>
  );
}
