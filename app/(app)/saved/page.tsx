import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FeedTimeline, { type FeedTimelineItem, type QuotedRepost } from "@/components/feed/FeedTimeline";
import { loadMoreSaved } from "./actions";
import { attachSignedMedia } from "@/lib/media";
import EmptyState from "@/components/ui/EmptyState";

// Bookmarks can target a post directly (post_id) OR a quote-repost
// (repost_id) — the two columns are XOR (see bookmarks table constraint).
// This mirrors REPOST_QUOTE_SELECT in lib/feed-quotes.ts, minus its own
// nested `bookmarks(user_id)` lookup: a row reaching this page is by
// definition one of the viewer's own saves, so that field is synthesized
// below instead of double-embedding bookmarks-within-reposts-within-bookmarks.
const SAVED_REPOST_SELECT =
  `id, quote_text, created_at, user_id, reactions(user_id, type), comments(count), reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student), post:posts(${POST_SELECT})`;

const BOOKMARK_SELECT = `created_at, post:posts(${POST_SELECT}), repost:reposts(${SAVED_REPOST_SELECT})`;

type SavedRepostRow = {
  id: string;
  quote_text: string | null;
  created_at: string;
  user_id: string;
  reactions: { user_id: string; type: string }[];
  comments: { count: number }[];
  reposter: QuotedRepost["reposter"] | null;
  post: FeedPost | null;
};

type BookmarkRow = {
  created_at: string;
  post: FeedPost | null;
  repost: SavedRepostRow | null;
};

function toQuote(
  r: SavedRepostRow,
  mediaByPostId: Map<string, FeedPost>,
  viewerId: string | null,
): QuotedRepost | null {
  if (!r.post || !r.quote_text || !r.reposter) return null;
  return {
    id: r.id,
    quote_text: r.quote_text,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: mediaByPostId.get(r.post.id) ?? r.post,
    reactions: r.reactions ?? [],
    bookmarks: viewerId ? [{ user_id: viewerId }] : [], // this page only lists the viewer's own saves
    comments: r.comments ?? [],
  };
}

export default async function SavedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const { data: rows } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE)
    .returns<BookmarkRow[]>();

  const rawRows = rows ?? [];
  // posts/reposts RLS re-checks visibility on the embed, so a saved post or
  // quote-repost that became invisible/deleted comes back null and is
  // filtered out below.
  const rawPosts = rawRows.flatMap((r) => (r.post ? [r.post] : r.repost?.post ? [r.repost.post] : []));
  const withMedia = await attachSignedMedia(supabase, rawPosts);
  const mediaByPostId = new Map(withMedia.map((p) => [p.id, p]));

  const items: FeedTimelineItem[] = [];
  for (const r of rawRows) {
    if (r.post) {
      items.push({ kind: "post", created_at: r.created_at, post: mediaByPostId.get(r.post.id) ?? r.post });
    } else if (r.repost) {
      const quote = toQuote(r.repost, mediaByPostId, viewerId);
      if (quote) items.push({ kind: "quote", created_at: r.created_at, quote });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Saved</h1>

      <section>
        {items.length === 0 ? (
          <EmptyState
            title="No saved posts yet"
            description="Bookmark posts from the feed to find them here later."
            action={{ label: "Go to feed", href: "/feed" }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <FeedTimeline items={items} viewerId={viewerId} />
            <FeedLoadMore
              cursor={rawRows[rawRows.length - 1].created_at}
              hasMore={rawRows.length === PAGE}
              viewerId={viewerId}
              action={loadMoreSaved}
            />
          </div>
        )}
      </section>
    </main>
  );
}
