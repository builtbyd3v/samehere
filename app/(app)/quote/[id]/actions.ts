"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
