import { createClient } from "@/lib/supabase/server";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";

// Heatmap + streak card — does its own fetch (get_heatmap + get_streak RPCs)
// so it can stream in behind its own Suspense boundary instead of blocking
// the rest of the profile page.
export default async function ProfileActivitySection({
  profileId,
  isOwner,
}: {
  profileId: string;
  isOwner: boolean;
}) {
  const supabase = await createClient();
  const [heatRes, streakRes] = await Promise.all([
    supabase.rpc("get_heatmap", { p_profile_id: profileId }),
    // get_heatmap-style call — enforces heatmap_visibility server-side itself;
    // an error here (hidden case) just means no streak is rendered.
    supabase.rpc("get_streak", { p_profile_id: profileId }),
  ]);
  const heatmap = (heatRes.data ?? []) as HeatmapDay[];
  const streak = streakRes.error ? null : (streakRes.data?.[0] ?? null);

  return (
    <section className="card card-hover p-5 shadow-paper sm:col-span-2 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Activity</h2>
        {streak && (streak.current_streak > 0 || streak.longest_streak > 0) && (
          <p className="text-sm text-[var(--ink-muted)]">
            <b className="font-semibold text-[var(--blue)]">{streak.current_streak}-day streak</b>
            {streak.longest_streak > streak.current_streak ? ` · best ${streak.longest_streak}` : ""}
          </p>
        )}
      </div>
      <ContributionHeatmap data={heatmap} />
      {isOwner && streak && streak.current_streak > 0 && !streak.today_earned && (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          Post today to keep your {streak.current_streak}-day streak.
        </p>
      )}
    </section>
  );
}
