import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import QuotedRepostCard, { type QuotedRepost } from "@/components/feed/QuotedRepostCard";
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
        const name = item.repost.reposter.display_name ?? item.repost.reposter.username;
        return (
          <div key={`repost-${item.repost.id}`}>
            <p className="mb-1.5 pl-1 text-xs font-medium text-[var(--ink-faint)]">{name} reposted</p>
            <PostCard post={item.repost.original} viewerId={viewerId} />
          </div>
        );
      })}
    </>
  );
}

export type { FeedTimelineItem, FeedPost, QuotedRepost, PlainRepost };
