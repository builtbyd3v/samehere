"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import { aiEnabled, generateText } from "@/lib/ai";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

export type ComposerState = { error?: string; ok?: boolean };

// Next page for "Load more": posts strictly older than the cursor (created_at
// of the last row shown). Keyset pagination — no OFFSET drift as new posts
// arrive. RLS still restricts to visible posts.
export async function loadMorePosts(cursor: string, postType?: string | null): Promise<FeedPost[]> {
  const supabase = await createClient();
  // ponytail: app-side filter post-fetch, not RLS on posts — mirrors the first page in feed/page.tsx.
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (postType) query = query.eq("post_type", postType);

  const [{ data }, { data: blockedIds }] = await Promise.all([
    query.returns<FeedPost[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const filtered = data?.filter((p) => !blocked.has(p.user_id)) ?? [];
  return await attachSignedMedia(supabase, filtered);
}

const MAX = TEXT_LIMITS.post;

// Create a post. Any non-empty content is allowed — the 150-char threshold only
// decides whether it earns a heatmap point, not whether it can be posted. Insert
// goes through the session client so RLS pins user_id to the author. We always
// call log_contribution with the true length; the function awards the point only
// when it qualifies (>=150) and dedupes per day.
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

  const postType = formData.get("post_type") === "teammate" ? "teammate" : null;

  const { error } = await supabase.from("posts").insert({ user_id: user.id, content, media, post_type: postType });
  if (error) return { error: "Could not publish your post. Try again." };

  await supabase.rpc("log_contribution", {
    p_action_type: "post",
    p_metadata: { character_count: content.length },
  });

  revalidatePath("/feed");
  return { ok: true };
}

const NUDGE_FALLBACKS = [
  "What did you build or fix today?",
  "What are you stuck on right now?",
  "Share one thing you learned this week.",
  "What are you working toward this semester?",
  "What's a small win from today?",
];

function randomFallback(): string {
  return NUDGE_FALLBACKS[Math.floor(Math.random() * NUDGE_FALLBACKS.length)];
}

// On-demand composer writing prompt. Metered via use_ai_quota; always falls
// back to a static prompt (AI off, over quota, or call failed) so this never
// throws and always returns something usable.
// ponytail: static fallback list covers AI-off/over-quota; on-demand only, so no quota burn on render.
export async function composerNudge(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return randomFallback();

  if (aiEnabled()) {
    const { data: allowed } = await supabase.rpc("use_ai_quota", {
      p_kind: "composer_nudge",
      p_cap: 3,
    });
    if (allowed) {
      const text = await generateText(
        "Give one short writing prompt — a question — that inspires a student to post about what they're building, learning, or struggling with. One sentence, no preamble, no quotes.",
        "Give me one prompt."
      );
      if (text) return text;
    }
  }

  return randomFallback();
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
