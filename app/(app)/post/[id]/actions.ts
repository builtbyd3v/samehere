"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommentState = { error?: string; ok?: boolean };

const MAX = 2000;

// Create a comment. Any non-empty length is allowed; 50 chars only decides the
// heatmap point (gated inside log_contribution). Insert goes through the session
// client so RLS pins user_id to the author.
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
  if (content.length > MAX) return { error: `Comments are capped at ${MAX} characters.` };

  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content });
  if (error) return { error: "Could not post your comment. Try again." };

  await supabase.rpc("log_contribution", {
    p_action_type: "comment",
    p_metadata: { character_count: content.length },
  });

  revalidatePath(`/post/${postId}`);
  return { ok: true };
}
