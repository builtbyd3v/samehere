import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import QuotedRepostCard, { type QuotedRepost } from "@/components/feed/QuotedRepostCard";
import { mergeFeedTimeline, type FeedTimelineItem } from "@/lib/feed-timeline";

export default function FeedTimeline({
  items,
  viewerId,
}: {
  items: FeedTimelineItem[];
  viewerId: string | null;
}) {
  return (
    <>
      {items.map((item) =>
        item.kind === "post" ? (
          <PostCard key={`post-${item.post.id}`} post={item.post} viewerId={viewerId} />
        ) : (
          <QuotedRepostCard key={`quote-${item.quote.id}`} item={item.quote} viewerId={viewerId} />
        ),
      )}
    </>
  );
}

export type { FeedTimelineItem, FeedPost, QuotedRepost };
