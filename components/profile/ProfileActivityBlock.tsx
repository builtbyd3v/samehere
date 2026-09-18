import { ActivitySection } from "@/components/portfolio/ProfileSections";
import { heatmapBreakdown, type SamehereDay } from "@/lib/portfolio/activity";
import { createClient } from "@/lib/supabase/server";
import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";

export default async function ProfileActivityBlock({
  profileId,
  canReadHeatmap,
  previewPublic,
  publicSamehere,
  publicSamehereKnown,
  github,
  connection,
  isOwner,
}: {
  profileId: string;
  canReadHeatmap: boolean;
  previewPublic: boolean;
  publicSamehere: SamehereDay[];
  publicSamehereKnown: boolean;
  github: GithubContributionDay[];
  connection: GithubConnectionPublic | null;
  isOwner: boolean;
}) {
  const supabase = await createClient();
  const [heatmapRes, streakRes] = await Promise.all([
    !previewPublic && canReadHeatmap
      ? supabase.rpc("get_heatmap", { p_profile_id: profileId })
      : Promise.resolve({
          data: [] as { day: string; points: number; breakdown?: Record<string, number> }[],
          error: null,
        }),
    supabase.rpc("get_streak", { p_profile_id: profileId }),
  ]);
  const ownerHeatmapKnown = !heatmapRes.error;
  const samehere = previewPublic
    ? publicSamehere
    : canReadHeatmap
      ? (heatmapRes.data ?? []).map((d) => ({
          day: d.day,
          points: d.points,
          breakdown: heatmapBreakdown("breakdown" in d ? d.breakdown : null),
        }))
      : publicSamehere;
  const samehereKnown = previewPublic ? publicSamehereKnown : canReadHeatmap ? ownerHeatmapKnown : publicSamehereKnown;
  const streak = streakRes.error ? null : (streakRes.data?.[0] ?? null);

  return (
    <ActivitySection
      samehere={samehere}
      github={github}
      connection={connection}
      streak={streak}
      isOwner={isOwner}
      samehereKnown={samehereKnown}
    />
  );
}
