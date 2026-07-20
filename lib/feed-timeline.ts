import type { FeedPost } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";
import type { PlainRepost } from "@/lib/feed-reposts";

export type FeedTimelineItem =
  | { kind: "post"; created_at: string; post: FeedPost }
  | { kind: "quote"; created_at: string; quote: QuotedRepost }
  | { kind: "repost"; created_at: string; repost: PlainRepost };

// The underlying row id for a timeline item, regardless of kind. uuid text
// comparison (lexical) agrees with Postgres's uuid byte-comparison ordering
// here because every id is the same canonical lowercase-hyphenated form --
// same hyphen positions, same hex alphabet -- so sorting the text is
// equivalent to sorting the bytes. This must stay in sync with the SQL
// `order by ..., id desc` added in this same phase everywhere a cursor is used.
export function itemId(item: FeedTimelineItem): string {
  if (item.kind === "post") return item.post.id;
  if (item.kind === "quote") return item.quote.id;
  return item.repost.id;
}

// A plain repost renders the original post whole, reaction row and all. So one
// post can otherwise land on the page three times over -- as its own row, and
// once per person who reposted it -- each copy showing the same repost button.
// Collapse to one: the post itself wins, else the newest repost of it (reposts
// arrive created_at desc). Quotes are exempt: they carry their own commentary.
function dedupeReposts(posts: FeedPost[], reposts: PlainRepost[]): PlainRepost[] {
  const seen = new Set(posts.map((p) => p.id));
  return reposts.filter((r) => {
    if (seen.has(r.original.id)) return false;
    seen.add(r.original.id);
    return true;
  });
}

export function mergeFeedTimeline(
  posts: FeedPost[],
  quotes: QuotedRepost[],
  reposts: PlainRepost[] = [],
): FeedTimelineItem[] {
  const uniqueReposts = dedupeReposts(posts, reposts);
  return [
    ...posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post })),
    ...quotes.map((quote) => ({ kind: "quote" as const, created_at: quote.created_at, quote })),
    ...uniqueReposts.map((repost) => ({ kind: "repost" as const, created_at: repost.created_at, repost })),
  ].sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    const aId = itemId(a);
    const bId = itemId(b);
    return aId < bId ? 1 : -1;
  });
}
