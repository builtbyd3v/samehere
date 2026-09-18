import Link from "next/link";
import { getViewer, getViewerProfile } from "@/lib/viewer";
import AvatarBase from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";

function yearMajorLine(year: string | null, major: string | null): string | null {
  if (year && major) return `${year} · ${major}`;
  return year ?? major ?? null;
}

export default async function RightRail() {
  const { supabase, user } = await getViewer();
  if (!user) return null;

  const profile = await getViewerProfile();
  const school = profile?.profile_school?.school ?? null;
  const [{ data: suggestedRows }, { data: schoolRows }] = await Promise.all([
    supabase.rpc("get_suggested_profiles", { p_limit: 5 }),
    school ? supabase.rpc("get_suggested_profiles", { p_school: school, p_limit: 3 }) : Promise.resolve({ data: [] }),
  ]);
  const suggested = suggestedRows ?? [];
  const schoolPeople = schoolRows ?? [];

  return (
    <>
      {suggested.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People you should meet</h2>
          <div className="flex flex-col gap-2">
            {suggested.map((p, i) => {
              const nm = p.display_name ?? p.username;
              const line = yearMajorLine(p.year, p.major);
              return (
                <div
                  key={p.id}
                  className="cascade-up flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
                  style={{ "--delay": `${i * 80}ms` } as React.CSSProperties}
                >
                  <AvatarBase src={p.avatar_url} seed={p.username} name={nm} className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm" pro={p.is_pro} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <Link href={`/profile/${p.username}`} className="truncate font-medium hover:underline">{nm}</Link>
                      <UserBadges isPro={p.is_pro} isFounder={p.is_founder} isCampusFounder={p.is_campus_founder} isVerifiedStudent={p.verified_student} />
                    </div>
                    {line && <p className="truncate text-xs text-[var(--ink-muted)]">{line}</p>}
                  </div>
                  <FollowButton targetId={p.id} initial="none" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {schoolPeople.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People from {school}</h2>
          <div className="flex flex-col gap-2">
            {schoolPeople.map((p) => {
              const nm = p.display_name ?? p.username;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <AvatarBase src={p.avatar_url} seed={p.username} name={nm} className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm" pro={p.is_pro} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <Link href={`/profile/${p.username}`} className="truncate text-sm font-medium hover:underline">{nm}</Link>
                      <UserBadges isPro={p.is_pro} isFounder={p.is_founder} isCampusFounder={p.is_campus_founder} isVerifiedStudent={p.verified_student} />
                    </div>
                    <p className="truncate text-xs text-[var(--ink-muted)]">@{p.username}</p>
                  </div>
                  <FollowButton targetId={p.id} initial="none" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Invite friends</h2>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">Every friend who joins gets you closer to a free semester of Pro.</p>
        <Link href="/referrals" className="btn-primary mt-4 w-full">Get your invite link</Link>
      </section>

      <div className="px-2 pt-1 text-xs text-[var(--ink-faint)]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/pro" className="transition hover:text-[var(--ink-muted)]">Pro</Link>
          <Link href="/terms" className="transition hover:text-[var(--ink-muted)]">Terms</Link>
          <Link href="/privacy" className="transition hover:text-[var(--ink-muted)]">Privacy</Link>
        </div>
        <p className="mt-2">© SameHere</p>
      </div>
    </>
  );
}

export function RightRailFallback() {
  return (
    <>
      <section className="card p-5">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </section>
    </>
  );
}
