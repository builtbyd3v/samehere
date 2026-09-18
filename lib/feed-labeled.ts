import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, PAGE, withEngagement, type FeedPost, type PostRow } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import type { ContextLabel } from "@/lib/context-label";
import type { FeedCursor } from "@/lib/feed-cursor";
import type { Database } from "@/types/database.types";

// Network-wide labeled posts, recency + id. Query only — no new table, no RPC.
// Blocks and optional author excludes are applied after the select, same as
// LatestTab, so we never interpolate untrusted ids into a PostgREST `in()`.
export async function fetchLabeledPosts(
  supabase: SupabaseClient<Database>,
  opts: {
    viewerId: string | null;
    label?: ContextLabel | null;
    cursor?: FeedCursor | null;
    limit?: number;
    excludeUserIds?: Iterable<string>;
    blockedIds?: Iterable<string>;
  },
): Promise<FeedPost[]> {
  const limit = opts.limit ?? PAGE;
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (opts.label) {
    query = query.eq("context_label", opts.label);
  } else {
    query = query.not("context_label", "is", null);
  }

  if (opts.cursor) {
    query = query.or(
      `created_at.lt.${opts.cursor.created_at},and(created_at.eq.${opts.cursor.created_at},id.lt.${opts.cursor.id})`,
    );
  }

  const blockedReady = opts.blockedIds !== undefined;
  const [{ data }, blockedResult] = await Promise.all([
    query.returns<PostRow[]>(),
    blockedReady
      ? Promise.resolve({ data: [...opts.blockedIds!] })
      : opts.viewerId
        ? supabase.rpc("get_blocked_ids")
        : Promise.resolve({ data: [] as string[] }),
  ]);

  const blocked = new Set(blockedResult.data ?? []);
  const excluded = new Set(opts.excludeUserIds ?? []);
  const postRows = (data ?? []).filter((p) => !blocked.has(p.user_id) && !excluded.has(p.user_id));
  if (postRows.length === 0) return [];

  const signed = await attachSignedMedia(supabase, postRows);
  const mine = await fetchViewerMineState(
    supabase,
    opts.viewerId,
    signed.map((p) => p.id),
    [],
  );
  return withEngagement(signed, mine);
}
