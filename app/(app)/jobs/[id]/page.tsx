import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isPro } from "@/lib/pro";
import PitchButton from "../PitchButton";
import FitCheck from "./FitCheck";
import { relAge, isNew } from "../format";

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
  const box = size === "lg" ? "h-16 w-16 rounded-lg p-1.5" : "h-5 w-5 rounded p-0.5";
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
    <div
      className={`${box} flex shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--featured-surface)] font-semibold text-[var(--ink-muted)] ${size === "lg" ? "text-xl" : "text-[10px]"}`}
    >
      {org.charAt(0).toUpperCase()}
    </div>
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

  const [{ data: company }, { data: fit }, profile, { data: moreListings }] = await Promise.all([
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
  ]);
  const pro = isPro(profile?.data ?? { is_pro: false, pro_until: null });
  const more = moreListings ?? [];

  // "N students with a path here": same distinct-user-count query the board
  // runs, scoped to this listing's org.
  let studentCount = 0;
  {
    const { data: expRows } = await supabase
      .from("experiences")
      .select("user_id")
      .ilike("org", listing.org.replace(/[,()%*]/g, ""))
      .limit(1000);
    studentCount = new Set((expRows ?? []).map((e) => e.user_id)).size;
  }

  const chips = [
    listing.kind === "internship" ? "Internship" : "New grad",
    listing.category === "Other" ? null : listing.category,
    listing.term,
    listing.locations ? listing.locations.slice(0, 80) : null,
    listing.sponsorship,
    listing.degrees,
  ]
    .filter((c): c is string => !!c && c !== "N/A")
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
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[var(--ink)]">
              {listing.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{listing.org}</p>
          </div>
          {listing.posted_at && (
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isNew(listing.posted_at) && (
                <span className="rounded-full bg-[var(--blue-glow)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--blue)]">
                  New
                </span>
              )}
              <span className="text-xs text-[var(--ink-faint)]">posted {relAge(listing.posted_at)}</span>
            </div>
          )}
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--featured-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {studentCount > 0 && (
          <Link
            href={`/search?q=${encodeURIComponent(listing.org)}`}
            className="mt-3 inline-block rounded-full bg-[var(--blue-glow)] px-2.5 py-1 text-xs font-medium text-[var(--blue)] transition hover:opacity-80"
          >
            {studentCount} student{studentCount === 1 ? "" : "s"} with a path here
          </Link>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={listing.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Apply
            </a>
            {user && <PitchButton listingId={listing.id} pro={pro} />}
          </div>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--ink-muted)] underline transition hover:text-[var(--ink)]"
          >
            Read the full posting
          </a>
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
