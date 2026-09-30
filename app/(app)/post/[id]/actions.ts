"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

export type CommentState = { error?: string; ok?: boolean };

const MAX = TEXT_LIMITS.comment;

// Create a comment. Any non-empty length is allowed; 50 chars only decides the
// heatmap point, awarded by the comments_award_contribution AFTER INSERT trigger
// from the row's own length. Insert goes through the session client so RLS pins
// user_id to the author.
// ponytail: the comment INSERT policy checks only ownership, not post
// visibility, so a user could technically comment on a post they can't read
// (blind — they still can't SELECT it back). Add a visibility check in the
// policy if this ever matters.
export async function createComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const postId = String(formData.get("post_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!postId) return { error: "Missing post." };
  if (content.length === 0) return { error: "Write something first." };
  const limitErr = textLimitError("Comments", MAX, content.length);
  if (limitErr) return { error: limitErr };

  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content });
  if (error) return { error: "Could not post your comment. Try again." };

  // analytics only: never break the comment action
  try {
    const posthog = getPostHogServerClient();
    if (posthog) {
      const { data: post } = await supabase.from("posts").select("context_label").eq("id", postId).maybeSingle();
      posthog.capture({
        distinctId: user.id,
        event: "comment_created",
        properties: { on_label: post?.context_label ?? null },
      });
    }
  } catch {
    // ignore
  }

  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

// Delete own comment. RLS owner-only delete — a non-owner's call affects 0 rows.
// No revalidatePath: the post route is dynamic and the client refreshes itself.
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("comments").delete().eq("id", commentId);
}

export type StuckState = { error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Author marks their Stuck post solved, optionally naming the comment that helped.
// The RPC enforces author + stuck + comment-on-this-post; this only validates shape.
export async function markStuckResolved(postId: string, commentId: string | null): Promise<StuckState> {
  if (typeof postId !== "string" || !UUID_RE.test(postId)) return { error: "Invalid post." };
  if (commentId !== null && (typeof commentId !== "string" || !UUID_RE.test(commentId))) {
    return { error: "Invalid comment." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: post } = await supabase.from("posts").select("created_at").eq("id", postId).maybeSingle();
  if (!post) return { error: "Post not found." };

  const { error } = await supabase.rpc("mark_stuck_resolved", {
    p_post_id: postId,
    ...(commentId ? { p_comment_id: commentId } : {}),
  });
  if (error) return { error: "Could not mark this solved." };

  const openedMs = post.created_at ? Date.parse(post.created_at) : Date.now();
  getPostHogServerClient()?.capture({
    distinctId: user.id,
    event: "stuck_resolved",
    properties: {
      with_comment: commentId !== null,
      hours_open: Math.max(0, Math.round((Date.now() - openedMs) / 3_600_000)),
    },
  });
  return {};
}

export async function reopenStuck(postId: string): Promise<StuckState> {
  if (typeof postId !== "string" || !UUID_RE.test(postId)) return { error: "Invalid post." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  const { error } = await supabase.rpc("reopen_stuck", { p_post_id: postId });
  if (error) return { error: "Could not reopen this post." };
  return {};
}
