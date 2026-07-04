"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

export type CommentState = { error?: string; ok?: boolean };

const MAX = TEXT_LIMITS.comment;

export async function createQuoteComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const repostId = String(formData.get("repost_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!repostId) return { error: "Missing quote." };
  if (content.length === 0) return { error: "Write something first." };
  const limitErr = textLimitError("Comments", MAX, content.length);
  if (limitErr) return { error: limitErr };

  const { error } = await supabase.from("comments").insert({ repost_id: repostId, user_id: user.id, content });
  if (error) return { error: "Could not post your comment. Try again." };

  await supabase.rpc("log_contribution", {
    p_action_type: "comment",
    p_metadata: { character_count: content.length },
  });

  revalidatePath(`/quote/${repostId}`);
  return { ok: true };
}

// Delete own quote repost. RLS restricts to owner; cascades quote reactions/comments.
export async function deleteQuoteRepost(quoteId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("reposts").delete().eq("id", quoteId).eq("user_id", user.id);

  revalidatePath("/feed");
  revalidatePath(`/quote/${quoteId}`);
}
