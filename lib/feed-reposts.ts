import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
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

type RepostRow = {
  id: string;
  created_at: string;
  user_id: string;
  reposter: PlainRepost["reposter"] | null;
  post: FeedPost | null;
};

export async function fetchPlainReposts(
  supabase: SupabaseClient<Database>,
  opts: { userIds: string[]; limit?: number },
): Promise<PlainRepost[]> {
  if (!opts.userIds.length) return [];

  let query = supabase
    .from("reposts")
    .select(PLAIN_REPOST_SELECT)
    .is("quote_text", null)
    .in("user_id", opts.userIds)
    .order("created_at", { ascending: false });

  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) {
    console.error("fetchPlainReposts:", error.message);
    return [];
  }

  // post RLS returns null for the embedded post when the original is no
  // longer readable (deleted, or author went private) — skip those.
  const rows = ((data ?? []) as unknown as RepostRow[]).filter((r) => r.post && r.reposter);

  const originals = rows.map((r) => r.post!);
  const withMedia = originals.length ? await attachSignedMedia(supabase, originals) : [];
  const mediaByPostId = new Map(withMedia.map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter!,
    original: mediaByPostId.get(r.post!.id) ?? r.post!,
  }));
}
