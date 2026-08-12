import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import {
  AppNotice,
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import PitchButton from "../PitchButton";
import SaveJobButton from "@/components/jobs/SaveJobButton";
import TrackListingButton from "@/components/applications/TrackListingButton";
import FitCheck from "./FitCheck";
import { relAge, isNew } from "../format";
import { IconGraduationCap, IconPin } from "@/components/icons";
import AvatarBase from "@/components/ui/Avatar";

const PEERS_LIMIT = 6;
const HELP_KINDS = ["internship", "job", "research"] as const;

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

type ExpPeerRow = {
  user_id: string;
  role: string;
  term: string | null;
  kind: string;
  company_slug?: string | null;
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
  const box = size === "lg" ? "h-12 w-12 rounded-lg p-1.5" : "h-5 w-5 rounded p-0.5";
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
      className={`${box} shrink-0 border border-[var(--border)] ${size === "lg" ? "text-lg" : "text-[10px]"}`}
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

  const [{ data: company }, { data: fit }, profile, { data: moreListings }, { data: save }, { data: tracked }] =
    await Promise.all([
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
      user
        ? supabase
            .from("applications")
            .select("id")
            .eq("user_id", user.id)
            .eq("listing_id", id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const pro = isPro(profile?.data ?? { is_pro: false, pro_until: null });
  const saved = !!save;
  const isTracked = !!tracked;
  const more = moreListings ?? [];

  // Opt-in company helpers: internship/job/research experience at this org,
  // plus profiles.open_to_help. Prefer experiences.company_slug when both
  // listing and experience have it; fall back to org ilike. Soft-empty if
  // WS1 columns aren't live yet (never show unfiltered peers).
  let peers: PeerRow[] = [];
  {
    const orgSafe = listing.org.replace(/[,()%*]/g, "");
    const expSelect = "user_id, role, term, kind";
    const [{ data: blocked }, slugRes, ilikeRes] = await Promise.all([
      user ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
      listing.company_slug
        ? supabase
            .from("experiences")
            .select(expSelect)
            .eq("company_slug", listing.company_slug)
            .in("kind", [...HELP_KINDS])
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: null as ExpPeerRow[] | null, error: null }),
      supabase
        .from("experiences")
        .select(expSelect)
        .ilike("org", orgSafe)
        .in("kind", [...HELP_KINDS])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Prefer slug matches when the query succeeded with rows; otherwise use
    // ilike. If both fail (schema mid-rollout), leave peers empty.
    const slugRows = !slugRes.error && slugRes.data?.length ? (slugRes.data as ExpPeerRow[]) : null;
    const ilikeRows = !ilikeRes.error ? ((ilikeRes.data ?? []) as ExpPeerRow[]) : [];
    const expRows = slugRows ?? ilikeRows;

    const blockedSet = new Set((blocked ?? []) as string[]);
    const byUser = new Map<string, { role: string; term: string | null }>();
    for (const e of expRows) {
      if (blockedSet.has(e.user_id) || e.user_id === user?.id || byUser.has(e.user_id)) continue;
      byUser.set(e.user_id, { role: e.role, term: e.term });
    }
    const peerIds = [...byUser.keys()].slice(0, PEERS_LIMIT * 3);

    if (peerIds.length) {
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_pro, open_to_help")
        .in("id", peerIds)
        .eq("open_to_help", true);

      if (!profErr) {
        peers = (profiles ?? [])
          .filter((p) => byUser.has(p.id))
          .slice(0, PEERS_LIMIT)
          .map((p) => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            is_pro: p.is_pro,
            ...byUser.get(p.id)!,
          }));
      }
    }
  }
  const helperCount = peers.length;

  const location = listing.locations ? listing.locations.slice(0, 80) : null;
  const kindLabel = listing.kind === "internship" ? "Internship" : "New grad";
  const degrees = listing.degrees && listing.degrees !== "N/A" ? listing.degrees : null;
  const metaBits = [listing.category, listing.term, listing.sponsorship]
    .filter((c): c is string => !!c && c !== "N/A" && c !== "Other")
    .filter((c, i, a) => a.indexOf(c) === i);

  const desc = listing.description;
  const truncated = !!desc && desc.length > DESC_PREVIEW;
  const postedLabel = listing.posted_at
    ? isNew(listing.posted_at)
      ? `New · posted ${relAge(listing.posted_at)}`
      : `posted ${relAge(listing.posted_at)}`
    : null;

  return (
    <AppPage width="wide">
      <Link
        href="/jobs"
        className="mb-4 inline-flex text-sm text-[var(--ink-muted)] underline transition hover:text-[var(--ink)]"
      >
        ← All opportunities
      </Link>

      <div className="mb-2 flex items-center gap-3">
        <CompanyLogo org={listing.org} logoUrl={company?.logo_url} size="lg" />
        <p className="min-w-0 truncate text-sm font-medium text-[var(--ink)]">{listing.org}</p>
      </div>

      <AppPageHeader
        kicker={kindLabel}
        title={listing.title}
        description={
          <div className="space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-1.5">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <IconPin className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                  {location}
                </span>
              )}
              {postedLabel && (
                <>
                  {location && (
                    <span aria-hidden className="text-[var(--ink-faint)]">
                      ·
                    </span>
                  )}
                  <span>{postedLabel}</span>
                </>
              )}
            </p>
            {(metaBits.length > 0 || degrees) && (
              <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--ink-faint)]">
                {metaBits.map((bit, i) => (
                  <span key={bit}>
                    {i > 0 ? <span aria-hidden> · </span> : null}
                    {bit}
                  </span>
                ))}
                {degrees && (
                  <>
                    {metaBits.length > 0 ? <span aria-hidden> · </span> : null}
                    <span className="inline-flex items-center gap-1">
                      <IconGraduationCap className="h-3.5 w-3.5" />
                      {degrees}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        }
        action={
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
        }
      />

      {helperCount > 0 && (
        <div className="mb-5">
          <AppNotice tone="accent">
            <a href="#peers" className="font-medium underline-offset-2 hover:underline">
              {helperCount} {helperCount === 1 ? "person" : "people"} open to help who&apos;ve been here
            </a>
          </AppNotice>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {user && (
            <AppPanel className="p-5">
              <h2 className="text-sm font-medium tracking-[-0.01em] text-[var(--ink)]">Why you fit</h2>
              <FitCheck listingId={listing.id} initialReason={fit?.reason ?? null} />
            </AppPanel>
          )}

          {desc !== "" && (
            <AppPanel className="p-5">
              <h2 className="text-sm font-medium tracking-[-0.01em] text-[var(--ink)]">About the role</h2>
              {/* Scraped listing text is untrusted third-party data: plain text only. */}
              {desc === null ? (
                <p className="mt-3 text-sm text-[var(--ink-muted)]">Details are still syncing.</p>
              ) : (
                <div className="relative mt-3">
                  <p className="max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-muted)]">
                    {truncated ? desc.slice(0, DESC_PREVIEW) : desc}
                  </p>
                  {truncated && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--surface)] to-transparent" />
                  )}
                </div>
              )}
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-[var(--blue)] underline"
              >
                Read the full posting
              </a>
            </AppPanel>
          )}

          {desc === "" && (
            <AppNotice>
              This source doesn&apos;t publish descriptions; the posting has the details.
            </AppNotice>
          )}

          {peers.length > 0 && (
            <div id="peers">
              <AppPanel className="p-5">
                <h2 className="text-sm font-medium tracking-[-0.01em] text-[var(--ink)]">
                  People open to help who&apos;ve been here
                </h2>
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {peers.map((p) => {
                    const nm = p.display_name ?? p.username;
                    const meta = [p.role, p.term].filter(Boolean).join(" · ");
                    return (
                      <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
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
                        {/* Reuses ?to= DM deep link; empty threads show “Draft an intro”
                            (ICEBREAKER_SYSTEM) so help asks stay 1:1 without a new path. */}
                        <Link
                          href={`/messages?to=${encodeURIComponent(p.username)}`}
                          className="btn-ghost shrink-0 rounded-md px-3 py-1.5 text-sm"
                        >
                          Ask for help
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </AppPanel>
            </div>
          )}

          {company?.description && (
            <AppPanel className="p-5">
              <div className="flex items-center gap-2">
                <CompanyLogo org={listing.org} logoUrl={company.logo_url} size="sm" />
                <h2 className="text-sm font-medium tracking-[-0.01em] text-[var(--ink)]">About {listing.org}</h2>
              </div>
              <p className="mt-3 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-muted)]">
                {company.description}
              </p>
            </AppPanel>
          )}

          {more.length > 0 && (
            <AppPanel className="p-5">
              <h2 className="text-sm font-medium tracking-[-0.01em] text-[var(--ink)]">More at {listing.org}</h2>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {more.map((m) => {
                  const meta = [m.term !== "N/A" ? m.term : null, m.locations ? m.locations.slice(0, 80) : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/jobs/${m.id}`}
                        className="flex items-start justify-between gap-3 py-3 text-sm transition first:pt-0 last:pb-0 hover:text-[var(--ink)]"
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
            </AppPanel>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[5.5rem]">
          <AppPanel className="p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--accent-blue-strong)]">
              Keep it on your path
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              Save or track this listing so it shows up when you come back.
            </p>
            {user ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <SaveJobButton listingId={listing.id} initialSaved={saved} />
                <TrackListingButton listingId={listing.id} initialTracked={isTracked} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-faint)]">
                <Link href="/login" className="underline hover:text-[var(--ink)]">
                  Sign in
                </Link>{" "}
                to save and track.
              </p>
            )}
          </AppPanel>

          {user && (
            <AppPanel className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ink-faint)]">Pitch</p>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">Draft something specific before you submit.</p>
              <div className="mt-3">
                <PitchButton listingId={listing.id} pro={pro} block />
              </div>
            </AppPanel>
          )}
        </aside>
      </div>
    </AppPage>
  );
}
