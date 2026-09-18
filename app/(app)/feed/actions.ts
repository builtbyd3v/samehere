"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, withEngagement, type PostRow } from "@/components/feed/PostCard";
import { attachSignedMedia, verifyMediaLimits } from "@/lib/media";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { mergeFeedTimeline, itemId, type FeedTimelineItem } from "@/lib/feed-timeline";
import { decodeCursor, encodeCursor } from "@/lib/feed-cursor";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";
import { contextLabelError, parseContextLabel } from "@/lib/context-label";

export type ComposerState = { error?: string; ok?: boolean };

// Next page for "Load more": posts (+ quote-reposts + plain reposts) strictly
// older than the cursor (created_at of the last row shown). Keyset pagination
// — no OFFSET drift as new posts arrive. RLS still restricts to visible rows.
// Merges all three sources the same way the first page does (feed/page.tsx's
// LatestTab) so page 2+ doesn't silently drop quotes/reposts, then slices to
// PAGE and derives nextCursor from that slice.
export async function loadMorePosts(
  cursor: string,
): Promise<{ items: FeedTimelineItem[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const decoded = decodeCursor(cursor);
  // A malformed/tampered cursor (see lib/feed-cursor.ts's comment on this
  // being attacker-controlled Server Action input) must never reach a query
  // filter unvalidated -- stop pagination rather than guess.
  if (!decoded) return { items: [], nextCursor: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  // ponytail: app-side filter post-fetch, not RLS on posts — mirrors the first page in feed/page.tsx.
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE);
  query = query.or(
    `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`,
  );

  const [{ data }, { data: blockedIds }] = await Promise.all([
    query.returns<PostRow[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const postRows = (data ?? []).filter((p) => !blocked.has(p.user_id));

  const [rawQuotes, rawReposts] = await Promise.all([
    fetchQuotedReposts(supabase, { limit: PAGE, cursor: decoded, blockedIds: blocked }),
    fetchPlainReposts(supabase, { limit: PAGE, cursor: decoded, blockedIds: blocked }),
  ]);

  const allForSigning = [...postRows, ...rawQuotes.map((q) => q.post), ...rawReposts.map((r) => r.post)];
  const signedById = new Map(
    (allForSigning.length ? await attachSignedMedia(supabase, allForSigning) : []).map((p) => [p.id, p]),
  );

  const postIds = [...signedById.keys()];
  const repostIds = rawQuotes.map((q) => q.id);
  const mine = await fetchViewerMineState(supabase, viewerId, postIds, repostIds);
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const posts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = rawQuotes.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = rawReposts.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: engagedById.get(r.post.id)!,
  }));

  const items = mergeFeedTimeline(posts, quotes, reposts).slice(0, PAGE);
  const last = items[items.length - 1];
  const nextCursor = last ? encodeCursor(last.created_at, itemId(last)) : null;
  return { items, nextCursor };
}

const MAX = TEXT_LIMITS.post;

// Create a post. Any non-empty content is allowed — the 150-char threshold only
// decides whether it earns a heatmap point, not whether it can be posted. Insert
// goes through the session client so RLS pins user_id to the author. The heatmap
// point is awarded by the posts_award_contribution AFTER INSERT trigger, which
// measures the row's own length — a client can no longer request a point.
export async function createPost(_prev: ComposerState, formData: FormData): Promise<ComposerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const content = String(formData.get("content") ?? "").trim();
  if (content.length === 0) return { error: "Write something first." };
  const limitErr = textLimitError("Posts", MAX, content.length);
  if (limitErr) return { error: limitErr };

  // Media paths come from the client (already uploaded to storage) — untrusted
  // JSON, so re-validate shape + that each path is scoped to this user's folder.
  let media: { path: string; type: "image" | "video" }[] = [];
  const rawMedia = formData.get("media");
  if (typeof rawMedia === "string" && rawMedia.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMedia);
    } catch {
      return { error: "Invalid media." };
    }
    if (!Array.isArray(parsed) || parsed.length > 4) return { error: "Invalid media." };
    for (const item of parsed) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { path?: unknown }).path !== "string" ||
        !(item as { path: string }).path.startsWith(`${user.id}/`) ||
        ((item as { type?: unknown }).type !== "image" && (item as { type?: unknown }).type !== "video")
      ) {
        return { error: "Invalid media." };
      }
    }
    media = parsed as { path: string; type: "image" | "video" }[];
  }

  if (media.length > 0) {
    const mediaErr = await verifyMediaLimits(supabase, user.id, media);
    if (mediaErr) return { error: mediaErr };
  }

  const rawLabel = formData.get("context_label");
  const labelErr = contextLabelError(rawLabel);
  if (labelErr) return { error: labelErr };
  const context_label = parseContextLabel(rawLabel);

  const { error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, content, media, context_label });
  if (error) return { error: "Could not publish your post. Try again." };

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "post_created",
    properties: {
      has_media: media.length > 0,
      media_count: media.length,
      character_count: content.length,
    },
  });

  // activated: fires once, on the user's first post ever. Wrapped defensively —
  // a failure here must never surface as a broken post action.
  try {
    if (posthog) {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (count === 1) {
        posthog.capture({
          distinctId: user.id,
          event: "activated",
          properties: { via: "first_post" },
        });
      }
    }
  } catch {
    // analytics only — never break the post action
  }

  revalidatePath("/feed");
  return { ok: true };
}

// Delete own post. RLS restricts the delete to the owner, so a non-owner's
// call affects 0 rows — safe to run through the plain session client.
// ponytail: best-effort media purge on delete; orphan sweep later if it matters.
export async function deletePost(postId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase.from("posts").select("media").eq("id", postId).maybeSingle();
  const paths = ((row?.media ?? []) as { path: string }[]).map((m) => m.path);
  if (paths.length > 0) {
    await supabase.storage.from("post-media").remove(paths);
  }

  await supabase.from("posts").delete().eq("id", postId);

  revalidatePath("/feed");
}

// Count posts newer than a timestamp, for the feed's "N new posts" pill. Capped
// at 30 — the pill only needs "many", not an exact count. Blocked authors are
// filtered app-side, mirroring the first-page query in page.tsx.
export async function countNewerPosts(sinceIso: string): Promise<number> {
  const supabase = await createClient();
  const [{ data }, { data: blockedIds }] = await Promise.all([
    supabase.from("posts").select("id, user_id").gt("created_at", sinceIso).order("created_at", { ascending: false }).limit(30),
    supabase.rpc("get_blocked_ids"),
  ]);
  if (!data) return 0;
  const blocked = new Set(blockedIds ?? []);
  return data.filter((p) => !blocked.has(p.user_id ?? "")).length;
}
