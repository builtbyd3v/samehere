import type { FeedPost } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";
import type { PlainRepost } from "@/lib/feed-reposts";

export type FeedTimelineItem =
  | { kind: "post"; created_at: string; post: FeedPost }
  | { kind: "quote"; created_at: string; quote: QuotedRepost }
  | { kind: "repost"; created_at: string; repost: PlainRepost };

export function mergeFeedTimeline(
  posts: FeedPost[],
  quotes: QuotedRepost[],
  reposts: PlainRepost[] = [],
): FeedTimelineItem[] {
  return [
    ...posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post })),
    ...quotes.map((quote) => ({ kind: "quote" as const, created_at: quote.created_at, quote })),
    ...reposts.map((repost) => ({ kind: "repost" as const, created_at: repost.created_at, repost })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
