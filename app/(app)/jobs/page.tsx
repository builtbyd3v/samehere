import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import EmptyState from "@/components/ui/EmptyState";
import { IconBriefcase } from "@/components/icons";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MatchesSection from "./MatchesSection";
import PitchButton from "./PitchButton";
import type { JobFitResult } from "./actions";

const PAGE = 30;

type ListingRow = {
  id: string;
  org: string;
  title: string;
  kind: string;
  locations: string | null;
  term: string | null;
  url: string;
  posted_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const kind = params.kind === "internship" || params.kind === "new_grad" ? params.kind : "";
  const q = (params.q ?? "").trim().slice(0, TEXT_LIMITS.searchQuery);

  const { supabase, user } = await getViewer();

  let query = supabase
    .from("job_listings")
    .select("id, org, title, kind, locations, term, url, posted_at")
    .eq("active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (kind) query = query.eq("kind", kind);
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
  const { data } = await query.range(from, from + PAGE).returns<ListingRow[]>(); // one extra row -> hasMore
  const rows = data ?? [];
  const hasMore = rows.length > PAGE;
  const listings = rows.slice(0, PAGE);

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
      .select("listing_id, reason, listing:job_listings(id, org, title, kind, locations, term, url, posted_at)")
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

  const filterHref = (next: { page?: number; kind?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (next.q ?? q) sp.set("q", next.q ?? q);
    if (next.kind ?? kind) sp.set("kind", next.kind ?? kind);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const s = sp.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <IconBriefcase className="h-5 w-5 text-[var(--blue)]" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Jobs</h1>
      </div>

      <MatchesSection initialResults={initialResults} pro={pro} />

      <form action="/jobs" className="mt-6 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search org or title"
          maxLength={TEXT_LIMITS.searchQuery}
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40"
        />
        <select
          name="kind"
          defaultValue={kind}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--border-strong)]"
        >
          <option value="">All kinds</option>
          <option value="internship">Internship</option>
          <option value="new_grad">New grad</option>
        </select>
        <button type="submit" className="btn-primary shrink-0">
          Filter
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="New internships and new-grad roles land here daily. Check back soon."
          />
        ) : (
          listings.map((l) => {
            const studentCount = countByOrg.get(l.org) ?? 0;
            return (
              <div key={l.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)]">{l.title}</p>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {l.org}
                      {l.locations ? ` · ${l.locations}` : ""}
                      {l.term ? ` · ${l.term}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-faint)]">
                      {l.kind === "internship" ? "Internship" : "New grad"}
                      {l.posted_at ? ` · posted ${formatDate(l.posted_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
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
                    className="mt-2 inline-block rounded-full bg-[var(--featured-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
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
