import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, withEngagement, type FeedPost, type PostRow } from "@/components/feed/PostCard";
import type { QuotedRepost } from "@/components/feed/QuotedRepostCard";
import { attachSignedMedia } from "@/lib/media";
import { fetchViewerMineState, type ViewerMineState } from "@/lib/feed-engagement";
import type { FeedCursor } from "@/lib/feed-cursor";
import type { Database } from "@/types/database.types";

const QUOTE_ENGAGEMENT = "reactions(count), comments(count)";

export const REPOST_QUOTE_SELECT = `id, quote_text, created_at, user_id, ${QUOTE_ENGAGEMENT}, reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student), post:posts(${POST_SELECT})`;

type QuoteRow = {
  id: string;
  quote_text: string | null;
  created_at: string;
  user_id: string;
  reactions: { count: number }[];
  comments: { count: number }[];
  reposter: QuotedRepost["reposter"] | null;
  post: PostRow | null;
};

// Everything needed to build a QuotedRepost EXCEPT the fully-hydrated
// `original` (signed + engaged) -- the caller supplies that once it has run
// the shared signing + mine-state batches across posts/quotes/reposts together.
export type RawQuote = {
  id: string;
  quote_text: string;
  created_at: string;
  user_id: string;
  reactions: { count: number }[];
  comments: { count: number }[];
  reposter: QuotedRepost["reposter"];
  post: PostRow;
};

// toQuotedRepost only ever reads the engagement/identity fields, never
// `post` (the caller already resolved `original` separately) -- accepting
// this narrower shape lets callers that never had a `post` field to begin
// with (e.g. saved/page.tsx's synthesized bookmark rows) pass their row
// straight through without a placeholder.
export type QuoteEngagementInput = Pick<
  RawQuote,
  "id" | "quote_text" | "created_at" | "user_id" | "reactions" | "comments" | "reposter"
>;

export function toQuotedRepost(row: QuoteEngagementInput, original: FeedPost, mine: ViewerMineState): QuotedRepost {
  return {
    id: row.id,
    quote_text: row.quote_text,
    created_at: row.created_at,
    reposter_id: row.user_id,
    reposter: row.reposter,
    original,
    samehere_count: row.reactions?.[0]?.count ?? 0,
    comment_count: row.comments?.[0]?.count ?? 0,
    mine_samehere: mine.samehere.has(row.id),
    mine_bookmark: mine.bookmark.has(row.id),
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
): Promise<RawQuote[]> {
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
  return rows.filter(
    (r): r is RawQuote =>
      !!r.post && !!r.quote_text && !!r.reposter && !(opts.blockedIds?.has(r.user_id) ?? false),
  );
}

// Single-item fetch for /quote/[id] -- signs + resolves engagement for just
// this one repost id (a batch of 1 is still correct, just not worth
// generalizing into the shared multi-item path above).
export async function fetchQuotedRepostById(
  supabase: SupabaseClient<Database>,
  id: string,
  viewerId: string | null,
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

  const [signedOriginal] = await attachSignedMedia(supabase, [row.post]);
  const mine = await fetchViewerMineState(supabase, viewerId, [signedOriginal.id], [row.id]);
  const [original] = withEngagement([signedOriginal], mine);
  return toQuotedRepost(
    {
      id: row.id,
      quote_text: row.quote_text,
      created_at: row.created_at,
      user_id: row.user_id,
      reactions: row.reactions,
      comments: row.comments,
      reposter: row.reposter,
    },
    original,
    mine,
  );
}
