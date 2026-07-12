import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, withEngagement, type FeedPost, type PostRow } from "@/components/feed/PostCard";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FeedTimeline, { type FeedTimelineItem, type QuotedRepost } from "@/components/feed/FeedTimeline";
import { toQuotedRepost } from "@/lib/feed-quotes";
import { fetchViewerMineState, type ViewerMineState } from "@/lib/feed-engagement";
import { loadMoreSaved } from "./actions";
import { attachSignedMedia } from "@/lib/media";
import EmptyState from "@/components/ui/EmptyState";

// Bookmarks can target a post directly (post_id) OR a quote-repost
// (repost_id) — the two columns are XOR (see bookmarks table constraint).
// This mirrors REPOST_QUOTE_SELECT in lib/feed-quotes.ts.
const SAVED_REPOST_SELECT =
  `id, quote_text, created_at, user_id, reactions(count), comments(count), reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student), post:posts(${POST_SELECT})`;

const BOOKMARK_SELECT = `created_at, post:posts(${POST_SELECT}), repost:reposts(${SAVED_REPOST_SELECT})`;

type SavedRepostRow = {
  id: string;
  quote_text: string | null;
  created_at: string;
  user_id: string;
  reactions: { count: number }[];
  comments: { count: number }[];
  reposter: QuotedRepost["reposter"] | null;
  post: PostRow | null;
};

type BookmarkRow = {
  created_at: string;
  post: PostRow | null;
  repost: SavedRepostRow | null;
};

function toQuote(r: SavedRepostRow, original: FeedPost, mine: ViewerMineState): QuotedRepost | null {
  if (!r.post || !r.quote_text || !r.reposter) return null;
  return toQuotedRepost(
    {
      id: r.id,
      quote_text: r.quote_text,
      created_at: r.created_at,
      user_id: r.user_id,
      reactions: r.reactions,
      comments: r.comments,
      reposter: r.reposter,
    },
    original,
    mine,
  );
}

export default async function SavedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const [{ data: rows }, { data: blockedIds }] = await Promise.all([
    supabase
      .from("bookmarks")
      .select(BOOKMARK_SELECT)
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .returns<BookmarkRow[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);

  // Blocking is app-side, not in posts RLS — drop any saved row whose relevant
  // author (post author, reposter, or the reposted original's author) is
  // blocked either direction. Mirrors the fetch-then-filter in feed/actions.ts.
  const blocked = new Set(blockedIds ?? []);
  const rawRows = (rows ?? []).filter((r) => {
    if (r.post) return !blocked.has(r.post.user_id);
    if (r.repost)
      return !blocked.has(r.repost.user_id) && !(r.repost.post && blocked.has(r.repost.post.user_id));
    return true;
  });
  // posts/reposts RLS re-checks visibility on the embed, so a saved post or
  // quote-repost that became invisible/deleted comes back null and is
  // filtered out below.
  const rawPosts = rawRows.flatMap((r) => (r.post ? [r.post] : r.repost?.post ? [r.repost.post] : []));
  const signedPosts = await attachSignedMedia(supabase, rawPosts);
  const signedById = new Map(signedPosts.map((p) => [p.id, p]));

  const postIds = [...signedById.keys()];
  const repostIds = rawRows.flatMap((r) => (r.repost ? [r.repost.id] : []));
  const mine = await fetchViewerMineState(supabase, viewerId, postIds, repostIds);
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const items: FeedTimelineItem[] = [];
  for (const r of rawRows) {
    if (r.post) {
      items.push({ kind: "post", created_at: r.created_at, post: engagedById.get(r.post.id)! });
    } else if (r.repost) {
      const quote = r.repost.post ? toQuote(r.repost, engagedById.get(r.repost.post.id)!, mine) : null;
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
