import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";
import { attachSignedMedia } from "@/lib/media";
import type { Database } from "@/types/database.types";

const QUOTE_ENGAGEMENT =
  "reactions(user_id, type), bookmarks(user_id), comments(count)";

export const REPOST_QUOTE_SELECT = `id, quote_text, created_at, user_id, ${QUOTE_ENGAGEMENT}, reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder), post:posts(${POST_SELECT})`;

type QuoteRow = {
  id: string;
  quote_text: string | null;
  created_at: string;
  user_id: string;
  reactions: { user_id: string; type: string }[];
  bookmarks: { user_id: string }[];
  comments: { count: number }[];
  reposter: QuotedRepost["reposter"] | null;
  post: FeedPost | null;
};

function mapQuoteRow(r: QuoteRow, mediaByPostId: Map<string, FeedPost>): QuotedRepost | null {
  if (!r.post || !r.quote_text || !r.reposter) return null;
  return {
    id: r.id,
    quote_text: r.quote_text,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: mediaByPostId.get(r.post.id) ?? r.post,
    reactions: r.reactions ?? [],
    bookmarks: r.bookmarks ?? [],
    comments: r.comments ?? [],
  };
}

export async function fetchQuotedReposts(
  supabase: SupabaseClient<Database>,
  opts: {
    userIds?: string[];
    limit?: number;
    cursor?: string;
    blockedIds?: Set<string>;
  },
): Promise<QuotedRepost[]> {
  let query = supabase
    .from("reposts")
    .select(REPOST_QUOTE_SELECT)
    .not("quote_text", "is", null)
    .order("created_at", { ascending: false });

  if (opts.userIds?.length) query = query.in("user_id", opts.userIds);
  if (opts.limit) query = query.limit(opts.limit);
  if (opts.cursor) query = query.lt("created_at", opts.cursor);

  const { data, error } = await query;
  if (error) {
    console.error("fetchQuotedReposts:", error.message);
    return [];
  }

  const rows = (data ?? []) as QuoteRow[];
  const visible = rows.filter(
    (r) =>
      r.post &&
      r.quote_text &&
      r.reposter &&
      !(opts.blockedIds?.has(r.user_id) ?? false),
  );

  const originals = visible.map((r) => r.post!);
  const withMedia = originals.length ? await attachSignedMedia(supabase, originals) : [];
  const mediaByPostId = new Map(withMedia.map((p) => [p.id, p]));

  return visible
    .map((r) => mapQuoteRow(r, mediaByPostId))
    .filter((q): q is QuotedRepost => q !== null);
}

export async function fetchQuotedRepostById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<QuotedRepost | null> {
  const { data, error } = await supabase
    .from("reposts")
    .select(REPOST_QUOTE_SELECT)
    .eq("id", id)
    .not("quote_text", "is", null)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as QuoteRow;
  if (!row.post || !row.quote_text || !row.reposter) return null;

  const [original] = await attachSignedMedia(supabase, [row.post]);
  return mapQuoteRow({ ...row, post: original }, new Map([[original.id, original]]));
}
