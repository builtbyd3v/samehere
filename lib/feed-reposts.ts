import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, type FeedPost, type PostRow } from "@/components/feed/PostCard";
import type { FeedCursor } from "@/lib/feed-cursor";
import type { Database } from "@/types/database.types";

// Plain reposts (reposts.quote_text IS NULL) — quote reposts are handled by
// lib/feed-quotes.ts. Mirrors that file's fetch/shape pattern.
export type PlainRepost = {
  id: string;
  created_at: string;
  reposter_id: string;
  reposter: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_pro: boolean;
    is_founder: boolean;
  };
  original: FeedPost;
};

const PLAIN_REPOST_SELECT = `id, created_at, user_id, reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder), post:posts(${POST_SELECT})`;

export type RawRepost = {
  id: string;
  created_at: string;
  user_id: string;
  reposter: PlainRepost["reposter"];
  post: PostRow;
};

type RepostRow = {
  id: string;
  created_at: string;
  user_id: string;
  reposter: PlainRepost["reposter"] | null;
  post: PostRow | null;
};

export async function fetchPlainReposts(
  supabase: SupabaseClient<Database>,
  opts: { userIds?: string[]; limit?: number; cursor?: FeedCursor; blockedIds?: Set<string> },
): Promise<RawRepost[]> {
  // userIds omitted = global (e.g. Latest tab); an explicit empty array means
  // "no one to fetch for" (mirrors the old required-array behavior).
  if (opts.userIds && opts.userIds.length === 0) return [];

  let query = supabase
    .from("reposts")
    .select(PLAIN_REPOST_SELECT)
    .is("quote_text", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (opts.userIds?.length) query = query.in("user_id", opts.userIds);
  if (opts.limit) query = query.limit(opts.limit);
  if (opts.cursor) {
    query = query.or(
      `created_at.lt.${opts.cursor.created_at},and(created_at.eq.${opts.cursor.created_at},id.lt.${opts.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchPlainReposts:", error.message);
    return [];
  }

  // post RLS returns null for the embedded post when the original is no
  // longer readable (deleted, or author went private) — skip those. reposts
  // RLS already mirrors block state (20260711110000), so blockedIds here is
  // belt-and-suspenders app-side filtering, matching fetchQuotedReposts.
  return ((data ?? []) as unknown as RepostRow[]).filter(
    (r): r is RawRepost => !!r.post && !!r.reposter && !(opts.blockedIds?.has(r.user_id) ?? false),
  );
}
