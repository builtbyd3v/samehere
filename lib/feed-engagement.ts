import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Per-render viewer engagement state: which post_ids/repost_ids the current
// viewer reacted "samehere" to, reposted (post_id only -- you can't repost
// a repost), or bookmarked. Five small `.in()`-bounded queries in one
// Promise.all -- O(1) round trips per render (bounded by the ids on THIS
// page), replacing the old approach of embedding every reactor's/
// reposter's/bookmarker's user_id as a full row array inside every post
// payload (components/feed/PostCard.tsx's POST_SELECT, pre-Phase-2).
export type ViewerMineState = {
  samehere: Set<string>; // post_id OR repost_id
  repost: Set<string>; // post_id only
  bookmark: Set<string>; // post_id OR repost_id
};

const EMPTY: ViewerMineState = { samehere: new Set(), repost: new Set(), bookmark: new Set() };

function ids(rows: { post_id?: string | null; repost_id?: string | null }[] | null, key: "post_id" | "repost_id"): string[] {
  return (rows ?? []).map((r) => r[key]).filter((id): id is string => !!id);
}

export async function fetchViewerMineState(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  postIds: string[],
  repostIds: string[] = [],
): Promise<ViewerMineState> {
  if (!viewerId || (postIds.length === 0 && repostIds.length === 0)) return EMPTY;

  const [reactPost, reactRepost, repostMine, bookmarkPost, bookmarkRepost] = await Promise.all([
    postIds.length
      ? supabase.from("reactions").select("post_id").eq("user_id", viewerId).eq("type", "samehere").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    repostIds.length
      ? supabase.from("reactions").select("repost_id").eq("user_id", viewerId).eq("type", "samehere").in("repost_id", repostIds)
      : Promise.resolve({ data: [] }),
    // quote_text IS NULL: legacy quote reposts live in this same table under
    // unique(post_id, user_id). Without the filter, having quoted a post lights
    // up its plain-repost button, and "undo" then deletes the quote.
    postIds.length
      ? supabase.from("reposts").select("post_id").eq("user_id", viewerId).is("quote_text", null).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("bookmarks").select("post_id").eq("user_id", viewerId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    repostIds.length
      ? supabase.from("bookmarks").select("repost_id").eq("user_id", viewerId).in("repost_id", repostIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    samehere: new Set([...ids(reactPost.data, "post_id"), ...ids(reactRepost.data, "repost_id")]),
    repost: new Set(ids(repostMine.data, "post_id")),
    bookmark: new Set([...ids(bookmarkPost.data, "post_id"), ...ids(bookmarkRepost.data, "repost_id")]),
  };
}
