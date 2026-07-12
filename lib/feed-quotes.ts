import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";
import { attachSignedMedia } from "@/lib/media";
import type { FeedCursor } from "@/lib/feed-cursor";
import type { Database } from "@/types/database.types";

const QUOTE_ENGAGEMENT =
  "reactions(user_id, type), bookmarks(user_id), comments(count)";

export const REPOST_QUOTE_SELECT = `id, quote_text, created_at, user_id, ${QUOTE_ENGAGEMENT}, reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student), post:posts(${POST_SELECT})`;

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
    cursor?: FeedCursor;
    blockedIds?: Set<string>;
  },
): Promise<QuotedRepost[]> {
  let query = supabase
    .from("reposts")
    .select(REPOST_QUOTE_SELECT)
    .not("quote_text", "is", null)
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

  // Media signing moved to the caller (one shared batch across posts +
  // quotes + reposts -- see app/(app)/feed/page.tsx's LatestTab). `original`
  // here is UNSIGNED (media entries lack a real `url`) until the caller
  // fixes it up.
  return visible
    .map((r) => mapQuoteRow(r, new Map()))
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
