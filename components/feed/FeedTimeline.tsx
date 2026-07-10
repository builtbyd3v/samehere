import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import QuotedRepostCard, { type QuotedRepost } from "@/components/feed/QuotedRepostCard";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import { IconRepost } from "@/components/icons";
import type { PlainRepost } from "@/lib/feed-reposts";
import type { FeedTimelineItem } from "@/lib/feed-timeline";

export default function FeedTimeline({
  items,
  viewerId,
}: {
  items: FeedTimelineItem[];
  viewerId: string | null;
}) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === "post") {
          return <PostCard key={`post-${item.post.id}`} post={item.post} viewerId={viewerId} />;
        }
        if (item.kind === "quote") {
          return <QuotedRepostCard key={`quote-${item.quote.id}`} item={item.quote} viewerId={viewerId} />;
        }
        const reposter = item.repost.reposter;
        const name = reposter.display_name ?? reposter.username;
        return (
          <div
            key={`repost-${item.repost.id}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"
          >
            <ProfileHoverLink
              href={`/profile/${reposter.username}`}
              username={reposter.username}
              className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              <IconRepost />
              <span>{name} reposted</span>
            </ProfileHoverLink>
            <PostCard post={item.repost.original} viewerId={viewerId} />
          </div>
        );
      })}
    </>
  );
}

export type { FeedTimelineItem, FeedPost, QuotedRepost, PlainRepost };
