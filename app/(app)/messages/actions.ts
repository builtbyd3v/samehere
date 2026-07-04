"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startDmWithUsername(username: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile || profile.id === user.id) redirect("/messages");

  const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", {
    p_recipient: profile.id,
  });

  if (error || !conversationId) redirect("/messages");

  redirect(`/messages/${conversationId}`);
}

export type SendMessageState = { error?: string; ok?: boolean };

export type MessageUserResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function searchUsersForMessage(query: string): Promise<MessageUserResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const sanitized = q.replace(/[^a-z0-9_]/gi, "");
  if (!sanitized) return [];

  const [{ data: blocked }, { data: profiles }] = await Promise.all([
    supabase.rpc("get_blocked_ids"),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.${sanitized}%,display_name.ilike.%${sanitized}%`)
      .neq("id", user.id)
      .limit(8),
  ]);

  const blockedSet = new Set((blocked ?? []) as string[]);
  return (profiles ?? []).filter((p) => !blockedSet.has(p.id));
}

export async function sendMessage(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const conversationId = String(formData.get("conversation_id") ?? "");
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  if (!conversationId || !content) return { error: "Message cannot be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
  });

  if (error) return { error: "Could not send message. Try again." };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}
