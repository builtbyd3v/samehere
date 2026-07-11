"use server";

import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";

// Next page for "Load more" on /saved: bookmarks strictly older than the
// cursor. Cursor is the BOOKMARK's created_at (save time — the order this
// list is in), not the post's, since a saved post's own created_at can be
// anything. bookmarks is owner-only under RLS, so the query is already
// scoped to the caller; we still bail out with no user rather than let an
// unauthenticated request reach the query.
export async function loadMoreSaved(cursor: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], nextCursor: null };

  const [{ data: rows }, { data: blockedIds }] = await Promise.all([
    supabase
      .from("bookmarks")
      .select(`created_at, post:posts(${POST_SELECT})`)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .returns<{ created_at: string; post: FeedPost | null }[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);

  const rawRows = rows ?? [];
  const blocked = new Set(blockedIds ?? []);
  // posts RLS re-checks visibility on the embed, so a post that became
  // invisible/deleted comes back null and is filtered out here (mirrors
  // saved/page.tsx's first-page query). Blocking is app-side, not in posts RLS,
  // so also drop posts whose author is blocked either direction. nextCursor
  // stays on rawRows (the unfiltered fetch) so a fully-filtered tail doesn't
  // skip older bookmarks.
  const rawPosts = rawRows.map((r) => r.post).filter((p): p is FeedPost => !!p && !blocked.has(p.user_id));
  const posts = await attachSignedMedia(supabase, rawPosts);
  const nextCursor = rawRows.length ? rawRows[rawRows.length - 1].created_at : null;
  return { posts, nextCursor };
}
