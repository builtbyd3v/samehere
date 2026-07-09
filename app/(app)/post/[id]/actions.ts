"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
