import { createClient } from "@/lib/supabase/server";
import type { MatchSignal } from "@/lib/match";
import { isPro } from "@/lib/pro";
import { cachedConnectionPrompts, connectionPrompt } from "@/lib/connection-prompt";

// The "why you two match" line on a profile — does its own fetch (viewer's
// signal row + the connection-prompt cache/AI call) so the slow LLM round
// trip (300ms-2s) never blocks the profile header/posts from painting.
// candidate fields are cheap and already loaded by the page, so they're
// passed in rather than re-queried here.
export default async function ProfileMatchPrompt({
  viewerId,
  candidate,
}: {
  viewerId: string;
  candidate: { id: string; name: string } & MatchSignal;
}) {
  const supabase = await createClient();
  const { data: viewerSignalData } = await supabase
    .from("profiles")
    .select("year, major, skills, goals, bio, courses, is_pro, pro_until, profile_school(school)")
    .eq("id", viewerId)
    .maybeSingle();

  const viewerSignal: MatchSignal = {
    year: viewerSignalData?.year ?? null,
    major: viewerSignalData?.major ?? null,
    skills: viewerSignalData?.skills ?? null,
    goals: viewerSignalData?.goals ?? null,
    bio: viewerSignalData?.bio ?? null,
    school: viewerSignalData?.profile_school?.school ?? null,
    courses: viewerSignalData?.courses ?? null,
  };

  const cache = await cachedConnectionPrompts(supabase, viewerId, [candidate.id]);
  const matchPrompt =
    cache.get(candidate.id) ??
    (await connectionPrompt(
      supabase,
      viewerId,
      viewerSignal,
      candidate,
      isPro(viewerSignalData ?? { is_pro: false, pro_until: null }),
      true // cache already checked above — skip the redundant re-read
    ));

  if (!matchPrompt) return null;

  return (
    <p className="mt-2 text-sm text-[var(--ink-muted)]">
      <span aria-hidden="true">✦</span> {matchPrompt}
    </p>
  );
}
