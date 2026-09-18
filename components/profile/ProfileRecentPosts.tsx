import { POST_SELECT, withEngagement, type PostRow } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import { attachSignedMedia } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileRecentPosts({
  profileId,
  username,
  viewerId,
  isOwner,
  isBlocked,
  contentHidden,
}: {
  profileId: string;
  username: string;
  viewerId: string;
  isOwner: boolean;
  isBlocked: boolean;
  contentHidden: boolean;
}) {
  if (isBlocked) {
    return (
      <section>
        <h2 className="eyebrow mb-3">Posts</h2>
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-[var(--ink)]">Posts unavailable</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            You and @{username} cannot see each other&apos;s posts.
          </p>
        </div>
      </section>
    );
  }
  if (contentHidden) {
    return (
      <section>
        <h2 className="eyebrow mb-3">Posts</h2>
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-[var(--ink)]">This account is private</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">Follow @{username} to see their posts.</p>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const [postsRes, quotesRes, repostsRes] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<PostRow[]>(),
    fetchQuotedReposts(supabase, { userIds: [profileId], limit: 20 }),
    fetchPlainReposts(supabase, { userIds: [profileId], limit: 20 }),
  ]);
  const postRows = postsRes.data ?? [];
  const allForSigning = [...postRows, ...quotesRes.map((q) => q.post), ...repostsRes.map((r) => r.post)];
  const postIds = [...new Set(allForSigning.map((p) => p.id))];
  const [signed, mine] = await Promise.all([
    allForSigning.length ? attachSignedMedia(supabase, allForSigning) : Promise.resolve([]),
    fetchViewerMineState(
      supabase,
      viewerId,
      postIds,
      quotesRes.map((q) => q.id),
    ),
  ]);
  const signedById = new Map(signed.map((p) => [p.id, p]));
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));
  const posts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = quotesRes.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = repostsRes.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: engagedById.get(r.post.id)!,
  }));
  const timeline = mergeFeedTimeline(posts, quotes, reposts).slice(0, 20);

  return (
    <section>
      <h2 className="eyebrow mb-3">Posts</h2>
      {timeline.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-[var(--ink)]">No posts yet</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            {isOwner ? "Share something to fill your feed." : `@${username} has not posted yet.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <FeedTimeline items={timeline} viewerId={viewerId} />
        </div>
      )}
    </section>
  );
}
