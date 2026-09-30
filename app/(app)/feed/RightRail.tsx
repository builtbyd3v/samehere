import Link from "next/link";
import { getViewer, getViewerProfile } from "@/lib/viewer";
import AvatarBase from "@/components/ui/Avatar";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Skeleton } from "@/components/ui/Skeleton";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";
import { fetchLabeledPosts } from "@/lib/feed-labeled";
import { stuckReplyPath } from "@/lib/feed-label";
import { authorMetaLine, splitQuestion, suggestionReason } from "@/lib/feed-view";
import { discoveryHref, parseDiscoveryFilters } from "@/lib/discovery";
import { parseStage } from "@/lib/stage";

export default async function RightRail() {
  const { supabase, user } = await getViewer();
  if (!user) return null;

  const profile = await getViewerProfile();
  const viewer = { stage: profile?.stage ?? null, school: profile?.profile_school?.school ?? null };
  const viewerStage = parseStage(viewer.stage);
  const [{ data: suggestedRows }, questionPosts] = await Promise.all([
    supabase.rpc("get_suggested_profiles", { p_limit: 3 }),
    fetchLabeledPosts(supabase, { viewerId: user.id, label: "stuck", limit: 6, excludeUserIds: [user.id] }),
  ]);
  const suggested = suggestedRows ?? [];
  // Honest heading: only claim "your stage" when the top suggestion really shares it.
  const sameStage = viewerStage !== null && suggested[0]?.stage === viewerStage;
  const seeAll = viewerStage ? discoveryHref({ filters: parseDiscoveryFilters({ stage: viewerStage }) }) : "/search";
  const questions = questionPosts.slice(0, 3);

  return (
    <>
      {suggested.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">{sameStage ? "At your stage" : "People to meet"}</h2>
            <Link href={seeAll} className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
              See all
            </Link>
          </div>
          {suggested.map((p) => {
            const nm = p.display_name ?? p.username;
            const reason = suggestionReason(viewer, {
              stage: p.stage ?? null,
              school: p.school ?? null,
              year: p.year ?? null,
              major: p.major ?? null,
            });
            return (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <AvatarBase src={p.avatar_url} seed={p.username} name={nm} className="size-9 shrink-0 rounded-full text-xs" pro={p.is_pro} />
                <div className="min-w-0 flex-1 leading-[1.35]">
                  <div className="flex min-w-0 items-center gap-x-1.5">
                    <Link href={`/profile/${p.username}`} className="truncate text-sm font-medium text-[var(--ink)] hover:underline">
                      {nm}
                    </Link>
                    <UserBadges
                      isPro={p.is_pro}
                      isFounder={p.is_founder}
                      isCampusFounder={p.is_campus_founder}
                      isVerifiedStudent={p.verified_student}
                    />
                  </div>
                  {reason ? <p className="truncate text-xs text-[var(--muted)]">{reason}</p> : null}
                </div>
                <FollowButton targetId={p.id} initial="none" variant="outline" />
              </div>
            );
          })}
        </section>
      )}

      {questions.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Open questions you could answer</h2>
          <div className="flex flex-col">
            {questions.map((post) => {
              const n = post.comment_count;
              const sub = [authorMetaLine(post.author), n === 0 ? "no answers yet" : `${n} ${n === 1 ? "answer" : "answers"}`]
                .filter(Boolean)
                .join(" · ");
              return (
                <Link
                  key={post.id}
                  href={stuckReplyPath(post.id)}
                  className="group flex flex-col gap-1 border-t border-[var(--hairline)] py-3"
                >
                  <span className="line-clamp-2 text-sm leading-[1.4] text-[var(--ink)] group-hover:text-[var(--accent-ink)]">
                    {splitQuestion(post.content).question}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{sub}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <MonoLabel as="div" className="flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/pro" className="hover:text-[var(--muted)]">
          Pro
        </Link>
        <Link href="/terms" className="hover:text-[var(--muted)]">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-[var(--muted)]">
          Privacy
        </Link>
        <span>© samehere</span>
      </MonoLabel>
    </>
  );
}

export function RightRailFallback() {
  return (
    <>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </section>
    </>
  );
}
