"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";

export type ComposerState = { error?: string; ok?: boolean };

// Next page for "Load more": posts strictly older than the cursor (created_at
// of the last row shown). Keyset pagination — no OFFSET drift as new posts
// arrive. RLS still restricts to visible posts.
export async function loadMorePosts(cursor: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(PAGE)
    .returns<FeedPost[]>();
  return data ?? [];
}

const MIN = 150;
const MAX = 5000;

// Create a post. The 150-char floor is enforced here AND by a DB CHECK; this
// check just gives a friendly message. Insert goes through the session client
// so RLS pins user_id to the author. Logs a 'post' contribution (5 pts, deduped
// per day inside the definer function).
export async function createPost(_prev: ComposerState, formData: FormData): Promise<ComposerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const content = String(formData.get("content") ?? "").trim();
  if (content.length < MIN)
    return { error: `Posts need at least ${MIN} characters — you have ${content.length}.` };
  if (content.length > MAX) return { error: `Posts are capped at ${MAX} characters.` };

  const { error } = await supabase.from("posts").insert({ user_id: user.id, content });
  if (error) return { error: "Could not publish your post. Try again." };

  await supabase.rpc("log_contribution", {
    p_action_type: "post",
    p_metadata: { character_count: content.length },
  });

  revalidatePath("/feed");
  return { ok: true };
}
