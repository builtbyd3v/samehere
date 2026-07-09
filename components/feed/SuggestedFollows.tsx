import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import FollowButton from "@/components/profile/FollowButton";
import { createClient } from "@/lib/supabase/server";
import { cachedConnectionPrompts, connectionPrompt } from "@/lib/connection-prompt";
import type { MatchSignal } from "@/lib/match";

export type SuggestedProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  year: string | null;
  major: string | null;
  skills: string[] | null;
  goals: string | null;
  bio: string | null;
  courses: string[] | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  profile_school: { school: string | null } | null;
};

function SuggestedCard({ s, prompt }: { s: SuggestedProfile; prompt?: string | null }) {
  const name = s.display_name ?? s.username;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
      {s.avatar_url ? (
        <AvatarImage
          src={s.avatar_url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
          pro={s.is_pro}
        />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <Link href={`/profile/${s.username}`} className="font-medium hover:underline">
            {name}
          </Link>
          <UserBadges isPro={s.is_pro} isFounder={s.is_founder} isCampusFounder={s.is_campus_founder} />
          <span className="text-[var(--ink-muted)]">@{s.username}</span>
        </div>
        {prompt && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{prompt}</p>}
      </div>
      <FollowButton targetId={s.id} initial="none" />
    </div>
  );
}

// Suspense fallback — same cards from the already-fetched (sync, non-AI)
// suggested pool, just without the AI "why follow" line yet.
export function SuggestedFollowsFallback({ suggested }: { suggested: SuggestedProfile[] }) {
  return (
    <div className="flex flex-col gap-2">
      {suggested.map((s) => (
        <SuggestedCard key={s.id} s={s} />
      ))}
    </div>
  );
}

// Does its own fetch (prompt cache read + up to 5 connectionPrompt AI calls)
// so the LLM round trips never block the feed timeline from streaming first.
export default async function SuggestedFollows({
  userId,
  viewerSignal,
  viewerPro,
  suggested,
}: {
  userId: string;
  viewerSignal: MatchSignal;
  viewerPro: boolean;
  suggested: SuggestedProfile[];
}) {
  const supabase = await createClient();
  const promptCache = await cachedConnectionPrompts(supabase, userId, suggested.map((s) => s.id));
  const prompts = await Promise.all(
    suggested.map((s) =>
      promptCache.has(s.id)
        ? Promise.resolve(promptCache.get(s.id)!)
        : connectionPrompt(
            supabase,
            userId,
            viewerSignal,
            {
              id: s.id,
              name: s.display_name ?? s.username,
              year: s.year,
              major: s.major,
              skills: s.skills,
              goals: s.goals,
              bio: s.bio,
              school: s.profile_school?.school ?? null,
              courses: s.courses,
            },
            viewerPro
          )
    )
  );

  return (
    <div className="flex flex-col gap-2">
      {suggested.map((s, i) => (
        <SuggestedCard key={s.id} s={s} prompt={prompts[i]} />
      ))}
    </div>
  );
}
