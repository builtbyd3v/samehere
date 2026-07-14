import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import PitchButton from "../PitchButton";
import SaveJobButton from "@/components/jobs/SaveJobButton";
import FitCheck from "./FitCheck";
import { relAge, isNew } from "../format";
import { IconGraduationCap, IconPin } from "@/components/icons";
import AvatarBase from "@/components/ui/Avatar";

const PEERS_LIMIT = 6;

type PeerRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  role: string;
  term: string | null;
};

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
  degrees: string | null;
  description: string | null;
  company_slug: string | null;
  active: boolean;
};

const DESC_PREVIEW = 900;

function CompanyLogo({
  org,
  logoUrl,
  size,
}: {
  org: string;
  logoUrl: string | null | undefined;
  size: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-14 w-14 rounded-xl p-2 shadow-sm" : "h-5 w-5 rounded p-0.5";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${box} shrink-0 border border-[var(--border)] object-contain bg-white`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <AvatarBase
      seed={org}
      name={org}
      className={`${box} shrink-0 border border-[var(--border)] ${size === "lg" ? "text-xl" : "text-[10px]"}`}
    />
  );
}

async function getListing(id: string) {
  const { supabase } = await getViewer();
  const { data } = await supabase
    .from("job_listings")
    .select(
      "id, org, title, kind, locations, term, url, posted_at, category, sponsorship, degrees, description, company_slug, active"
    )
    .eq("id", id)
    .maybeSingle<ListingRow>();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Job · samehere" };
  return { title: `${listing.title} at ${listing.org} · samehere` };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getViewer();

  const listing = await getListing(id);
  if (!listing || !listing.active) notFound();

  const [{ data: company }, { data: fit }, profile, { data: moreListings }, { data: save }] = await Promise.all([
    listing.company_slug
      ? supabase.from("job_companies").select("name, logo_url, description").eq("slug", listing.company_slug).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("job_fit").select("reason").eq("listing_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single()
      : Promise.resolve(null),
    supabase
      .from("job_listings")
      .select("id, title, term, locations, posted_at")
      .eq("active", true)
      .eq("org", listing.org)
      .neq("id", id)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(5),
    user
      ? supabase.from("job_saves").select("listing_id").eq("user_id", user.id).eq("listing_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const pro = isPro(profile?.data ?? { is_pro: false, pro_until: null });
  const saved = !!save;
  const more = moreListings ?? [];

  // "Students with a path here": real peers, not just a count -- distinct
  // user_id + role + term from experiences at this org, blocked-viewer ids
  // excluded (get_blocked_ids, same pattern as lib/people-search.ts), then
  // profile shells fetched for whoever's left. studentCount is derived from
  // this same post-filter list so the chip and the panel never disagree.
  let peers: PeerRow[] = [];
  {
    const [{ data: expRows }, { data: blocked }] = await Promise.all([
      supabase
        .from("experiences")
        .select("user_id, role, term")
        .ilike("org", listing.org.replace(/[,()%*]/g, ""))
        .order("created_at", { ascending: false })
        .limit(50),
      user ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] }),
    ]);

    const blockedSet = new Set((blocked ?? []) as string[]);
    const byUser = new Map<string, { role: string; term: string | null }>();
    for (const e of expRows ?? []) {
      if (blockedSet.has(e.user_id) || e.user_id === user?.id || byUser.has(e.user_id)) continue;
      byUser.set(e.user_id, { role: e.role, term: e.term });
    }
    const peerIds = [...byUser.keys()].slice(0, PEERS_LIMIT);

    if (peerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_pro")
        .in("id", peerIds);
      peers = (profiles ?? []).map((p) => ({ ...p, ...byUser.get(p.id)! }));
    }
  }
  const studentCount = peers.length;

  const location = listing.locations ? listing.locations.slice(0, 80) : null;
  const kindLabel = listing.kind === "internship" ? "Internship" : "New grad";
  const degrees = listing.degrees && listing.degrees !== "N/A" ? listing.degrees : null;
  const chips = [listing.category, listing.term, listing.sponsorship]
    .filter((c): c is string => !!c && c !== "N/A" && c !== "Other")
    .filter((c, i, a) => a.indexOf(c) === i);

  const desc = listing.description;
  const truncated = !!desc && desc.length > DESC_PREVIEW;

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Link href="/jobs" className="text-sm text-[var(--ink-muted)] underline">
        ← All jobs
      </Link>

      <div
        className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
        style={{ "--delay": "0ms" } as React.CSSProperties}
      >
        <div className="flex items-start gap-4">
          <CompanyLogo org={listing.org} logoUrl={company?.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--ink)] sm:text-[26px]">
                {listing.title}
              </h1>
              {listing.posted_at && isNew(listing.posted_at) && (
                <span className="rounded-full bg-[var(--blue-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--blue)]">
                  New
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--ink-muted)]">
              <span className="font-medium text-[var(--ink)]">{listing.org}</span>
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
            {listing.posted_at && (
              <p className="mt-1 text-xs text-[var(--ink-faint)]">posted {relAge(listing.posted_at)}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-[var(--canvas)]">
            {kindLabel}
          </span>
          {chips.map((c, i) => (
            <span
              key={i}
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

        {studentCount > 0 && (
          <a
            href="#peers"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--blue-glow)] px-2.5 py-1 text-xs font-medium text-[var(--blue)] transition hover:opacity-80"
          >
            {studentCount} student{studentCount === 1 ? "" : "s"} with a path here
          </a>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <a href={listing.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
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
          {user && <SaveJobButton listingId={listing.id} initialSaved={saved} />}
          {user && <PitchButton listingId={listing.id} pro={pro} block />}
        </div>
        {desc === "" && (
          <p className="mt-3 text-sm text-[var(--ink-faint)]">
            This source doesn&apos;t publish descriptions; the posting has the details.
          </p>
        )}
      </div>

      {user && (
        <div
          className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
          style={{ "--delay": "60ms" } as React.CSSProperties}
        >
          <h2 className="text-sm font-semibold text-[var(--ink)]">Why you fit</h2>
          <FitCheck listingId={listing.id} initialReason={fit?.reason ?? null} />
        </div>
      )}

      {peers.length > 0 && (
        <div
          id="peers"
          className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
          style={{ "--delay": "90ms" } as React.CSSProperties}
        >
          <h2 className="text-sm font-semibold text-[var(--ink)]">Students with a path here</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {peers.map((p) => {
              const nm = p.display_name ?? p.username;
              const meta = [p.role, p.term].filter(Boolean).join(" · ");
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
                  <Link href={`/profile/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <AvatarBase
                      src={p.avatar_url}
                      seed={p.username}
                      name={nm}
                      className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                      pro={p.is_pro}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium text-[var(--ink)]">{nm}</p>
                      {meta && <p className="truncate text-xs text-[var(--ink-muted)]">{meta}</p>}
                    </div>
                  </Link>
                  <Link href={`/messages?to=${encodeURIComponent(p.username)}`} className="btn-ghost shrink-0 rounded-md px-3 py-1.5 text-sm">
                    Say hi
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {desc !== "" && (
        <div
          className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
          style={{ "--delay": "120ms" } as React.CSSProperties}
        >
          <h2 className="text-sm font-semibold text-[var(--ink)]">About the role</h2>
          {/* Scraped listing text is untrusted third-party data: plain text only. */}
          {desc === null ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Details are still syncing.</p>
          ) : (
            <div className="relative mt-2">
              <p className="max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-muted)]">
                {truncated ? desc.slice(0, DESC_PREVIEW) : desc}
              </p>
              {truncated && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--surface-raised)] to-transparent" />
              )}
            </div>
          )}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-[var(--blue)] underline"
          >
            Read the full posting
          </a>
        </div>
      )}

      {company?.description && (
        <div
          className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
          style={{ "--delay": "180ms" } as React.CSSProperties}
        >
          <div className="flex items-center gap-2">
            <CompanyLogo org={listing.org} logoUrl={company.logo_url} size="sm" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">About {listing.org}</h2>
          </div>
          <p className="mt-2 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {company.description}
          </p>
        </div>
      )}

      {more.length > 0 && (
        <div
          className="cascade-up mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
          style={{ "--delay": "240ms" } as React.CSSProperties}
        >
          <h2 className="text-sm font-semibold text-[var(--ink)]">More at {listing.org}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {more.map((m) => {
              const meta = [m.term !== "N/A" ? m.term : null, m.locations ? m.locations.slice(0, 80) : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={m.id}>
                  <Link
                    href={`/jobs/${m.id}`}
                    className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2.5 text-sm transition hover:bg-[var(--featured-surface)]"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-[var(--ink)]">{m.title}</span>
                      {meta && <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{meta}</span>}
                    </span>
                    {m.posted_at && (
                      <span className="shrink-0 text-xs text-[var(--ink-faint)]">{relAge(m.posted_at)}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
