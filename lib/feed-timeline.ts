import type { FeedPost } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";

export type FeedTimelineItem =
  | { kind: "post"; created_at: string; post: FeedPost }
  | { kind: "quote"; created_at: string; quote: QuotedRepost };

export function mergeFeedTimeline(posts: FeedPost[], quotes: QuotedRepost[]): FeedTimelineItem[] {
  return [
    ...posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post })),
    ...quotes.map((quote) => ({ kind: "quote" as const, created_at: quote.created_at, quote })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
