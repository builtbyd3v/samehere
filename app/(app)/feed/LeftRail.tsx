import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import { Skeleton } from "@/components/ui/Skeleton";

function Initials({ name, className }: { name: string; className: string }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)] ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function LeftRail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const [{ data: profile }, { data: heatmapRaw }, { data: countsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_pro, verified_student, is_founder, is_campus_founder, profile_school(school)")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_heatmap", { p_profile_id: user.id }),
    supabase.rpc("get_profile_counts", { p_profile_id: user.id }),
  ]);

  const heatmap: HeatmapDay[] = (heatmapRaw ?? []).map((d) => ({
    day: d.day,
    points: d.points,
    breakdown: (d.breakdown as Record<string, number> | null) ?? {},
  }));

  const counts = countsData?.[0] ?? { posts: 0, followers: 0, following: 0 };

  const name = profile?.display_name ?? profile?.username ?? "You";
  const school = profile?.profile_school?.school ?? null;

  return (
    <>
      <section className="card p-5">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] object-cover" pro={profile.is_pro} />
          ) : (
            <Initials name={name} className="h-11 w-11" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${profile?.username}`} className="truncate font-semibold hover:underline">
                {name}
              </Link>
              <UserBadges isPro={!!profile?.is_pro} isFounder={!!profile?.is_founder} isCampusFounder={!!profile?.is_campus_founder} isVerifiedStudent={!!profile?.verified_student} />
            </div>
            {school && <p className="truncate text-[13px] text-[var(--ink-muted)]">{school}</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--border)] py-3 text-center">
          <Link href={`/profile/${profile?.username}`} className="transition hover:opacity-80">
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]">{counts.posts}</div>
            <div className="text-xs text-[var(--ink-muted)]">Posts</div>
          </Link>
          <Link href={`/profile/${profile?.username}`} className="transition hover:opacity-80">
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]">{counts.followers}</div>
            <div className="text-xs text-[var(--ink-muted)]">Followers</div>
          </Link>
          <Link href={`/profile/${profile?.username}`} className="transition hover:opacity-80">
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]">{counts.following}</div>
            <div className="text-xs text-[var(--ink-muted)]">Following</div>
          </Link>
        </div>
        <div className="mt-4">
          <ContributionHeatmap data={heatmap} />
        </div>
      </section>
    </>
  );
}

export function LeftRailFallback() {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-3 w-16" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--border)] py-3">
        <Skeleton className="mx-auto h-8 w-12" />
        <Skeleton className="mx-auto h-8 w-12" />
        <Skeleton className="mx-auto h-8 w-12" />
      </div>
      <Skeleton className="mt-4 h-24 w-full rounded-md" />
    </section>
  );
}
