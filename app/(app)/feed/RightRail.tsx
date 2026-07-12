import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedLeaderboard } from "@/lib/leaderboard";
import AvatarImage from "@/components/ui/AvatarImage";
import SuggestedFollows, { SuggestedFollowsFallback, type SuggestedProfile } from "@/components/feed/SuggestedFollows";
import { Skeleton } from "@/components/ui/Skeleton";
import { isPro } from "@/lib/pro";
import type { MatchSignal } from "@/lib/match";
import { IconHash } from "@/components/icons";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";

const SUGGESTED_SELECT =
  "id, username, display_name, avatar_url, year, major, goals, bio, is_pro, is_founder, is_campus_founder, verified_student, profile_school(school)";

function Initials({ name, className }: { name: string; className: string }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)] ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Persistent feed right rail. Every widget maps to
// a real feature: suggested peers (the sync suggested pool — no AI prompts
// here, this is the fallback card), leaderboard (getCachedLeaderboard), and
// the viewer's clubs.
export default async function RightRail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const [{ data: profile }, leaderboard, { data: myFollows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, is_pro, verified_student, is_founder, is_campus_founder, profile_school(school), year, major, goals, bio, pro_until")
        .eq("id", user.id)
        .single(),
      getCachedLeaderboard(supabase),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);

  const topRanks = (leaderboard ?? []).slice(0, 3);

  // Suggested: recent profiles excluding self + anyone already followed. Sync
  // pool only (SuggestedFollowsFallback) — the AI "why follow" line is a feed
  // concern, not needed for a rail test.
  const excludeIds = [user.id, ...(myFollows ?? []).map((f) => f.following_id)];
  const school = profile?.profile_school?.school ?? null;
  const [{ data: suggestedPool }, { data: schoolData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(SUGGESTED_SELECT)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<SuggestedProfile[]>(),
    school
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student, profile_school!inner(school)")
          .eq("profile_school.school", school)
          .not("id", "in", `(${excludeIds.join(",")})`)
          .limit(3)
          .returns<SuggestedProfile[]>()
      : Promise.resolve({ data: [] as SuggestedProfile[] }),
  ]);
  const suggested = suggestedPool ?? [];
  const schoolPeople = schoolData ?? [];

  const viewerSignal: MatchSignal = {
    year: profile?.year ?? null,
    major: profile?.major ?? null,
    goals: profile?.goals ?? null,
    bio: profile?.bio ?? null,
    school: profile?.profile_school?.school ?? null,
  };
  const viewerPro = isPro(profile ?? { is_pro: false, pro_until: null });

  const me = (leaderboard ?? []).find((r) => r.id === user.id) ?? null;

  // ponytail: placeholder trending data — swap for the real trending feature when it lands.
  const TRENDING = [
    { tag: "finalsweek", posts: 128 },
    { tag: "internships", posts: 94 },
    { tag: "studygroup", posts: 61 },
    { tag: "transferlife", posts: 47 },
    { tag: "csmajors", posts: 39 },
  ];

  return (
    <>
      {/* trending */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Trending</h2>
        <ul className="flex flex-col">
          {TRENDING.map((t) => (
            <li key={t.tag}>
              <Link href={`/feed?search=1&q=${encodeURIComponent("#" + t.tag)}`} className="flex items-center gap-2 rounded-lg px-1 py-2 transition hover:bg-[var(--featured-surface)]">
                <span className="text-[var(--ink-muted)]"><IconHash /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">#{t.tag}</p>
                  <p className="text-xs text-[var(--ink-muted)] tabular-nums">{t.posts} posts</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* suggested peers */}
      {suggested.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Suggested peers</h2>
          <Suspense fallback={<SuggestedFollowsFallback suggested={suggested} />}>
            <SuggestedFollows userId={user.id} viewerSignal={viewerSignal} viewerPro={viewerPro} suggested={suggested} />
          </Suspense>
        </section>
      )}

      {/* people from your school */}
      {schoolPeople.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People from {school}</h2>
          <div className="flex flex-col gap-2">
            {schoolPeople.map((p) => {
              const nm = p.display_name ?? p.username;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  {p.avatar_url
                    ? <AvatarImage src={p.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover" pro={p.is_pro} />
                    : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">{nm.charAt(0).toUpperCase()}</div>}
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

      {/* leaderboard */}
      {topRanks.length > 0 && (
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Leaderboard · this week</h2>
            <Link href="/community?tab=leaderboard" className="text-xs font-medium text-[var(--blue)] hover:underline">
              See all
            </Link>
          </div>
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-[var(--featured-surface)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">You</span>
            {me ? (
              <>
                <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">#{me.rank}</span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-[var(--ink)]">{me.weekly_points} pts</span>
              </>
            ) : (
              <span className="text-sm text-[var(--ink-muted)]">Not ranked yet — post to climb</span>
            )}
          </div>
          <ul className="flex flex-col">
            {topRanks.map((row) => {
              const rowName = row.display_name ?? row.username;
              return (
                <li key={row.id}>
                  <Link href={`/profile/${row.username}`} className={`flex items-center gap-3 rounded-lg px-1 py-2 transition hover:bg-[var(--featured-surface)]${row.id === user.id ? " bg-[var(--featured-surface)]" : ""}`}>
                    <span className="w-4 shrink-0 text-center text-sm font-semibold tabular-nums text-[var(--ink)]">{row.rank}</span>
                    {row.avatar_url ? (
                      <AvatarImage src={row.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover" pro={row.is_pro ?? false} />
                    ) : (
                      <Initials name={rowName} className="h-8 w-8" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{rowName}</p>
                      <p className="truncate text-xs text-[var(--ink-muted)]">
                        @{row.username}
                        {row.school ? ` · ${row.school}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{row.weekly_points} pts</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] text-[var(--blue)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Invite friends</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Every friend who joins gets you closer to a free semester of Pro.</p>
          </div>
        </div>
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
