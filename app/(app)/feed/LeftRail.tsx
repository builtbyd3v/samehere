import Link from "next/link";
import { getViewer, getViewerProfile, getViewerProfileCounts } from "@/lib/viewer";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import { Skeleton } from "@/components/ui/Skeleton";
import { isPro } from "@/lib/pro";
import { isProfileTheme, themeCssVars } from "@/lib/themes";

function Initials({ name, className }: { name: string; className: string }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)] ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function LeftRail() {
  const { supabase, user } = await getViewer();
  if (!user) return null; // proxy already gates this route

  const [profile, { data: heatmapRaw }, countsData] = await Promise.all([
    getViewerProfile(),
    supabase.rpc("get_heatmap", { p_profile_id: user.id }),
    getViewerProfileCounts(),
  ]);

  const heatmap: HeatmapDay[] = (heatmapRaw ?? []).map((d) => ({
    day: d.day,
    points: d.points,
    breakdown: (d.breakdown as Record<string, number> | null) ?? {},
  }));

  const counts = countsData ?? { posts: 0, followers: 0, following: 0 };

  const name = profile?.display_name ?? profile?.username ?? "You";
  const school = profile?.profile_school?.school ?? null;

  // Pro profile theme, same gate + precedence as the full profile page. When
  // set, the two wrapper divs + inline vars let the shared `.profile-themed
  // .theme-zone .card` rules tint this mini-card and recolor its heatmap.
  const theme = profile && isPro(profile) && isProfileTheme(profile.profile_theme) ? profile.profile_theme : null;
  const themeVars = themeCssVars(theme);

  return (
    <div className={theme ? "profile-themed" : undefined} style={themeVars}>
      <div className={theme ? "theme-zone" : undefined}>
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
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]" style={theme ? { color: "var(--profile-accent)" } : undefined}>{counts.posts}</div>
            <div className="text-xs text-[var(--ink-muted)]">Posts</div>
          </Link>
          <Link href={`/profile/${profile?.username}/followers`} className="transition hover:opacity-80">
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]" style={theme ? { color: "var(--profile-accent)" } : undefined}>{counts.followers}</div>
            <div className="text-xs text-[var(--ink-muted)]">Followers</div>
          </Link>
          <Link href={`/profile/${profile?.username}/following`} className="transition hover:opacity-80">
            <div className="text-base font-semibold tabular-nums text-[var(--ink)]" style={theme ? { color: "var(--profile-accent)" } : undefined}>{counts.following}</div>
            <div className="text-xs text-[var(--ink-muted)]">Following</div>
          </Link>
        </div>
        <div className="mt-4">
          <ContributionHeatmap data={heatmap} />
        </div>
      </section>
      </div>
    </div>
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
