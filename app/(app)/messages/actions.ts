"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { ICEBREAKER_SYSTEM } from "@/lib/ai-prompts";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { isPro } from "@/lib/pro";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

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
  const q = query.trim().slice(0, TEXT_LIMITS.dmUserSearch);
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
  const content = String(formData.get("content") ?? "").trim();
  if (!conversationId || !content) return { error: "Message cannot be empty." };
  const limitErr = textLimitError("Messages", TEXT_LIMITS.message, content.length);
  if (limitErr) return { error: limitErr };

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

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "message_sent",
    properties: {
      conversation_id: conversationId,
      character_count: content.length,
    },
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type IcebreakerResult = { locked: true } | { text: string } | { error: true };

type FactSource = {
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
  skills: string[] | null;
  courses: string[] | null;
};

// Compact fact list for the prompt. school comes from profile_school, whose own
// RLS already honors hide_school, so a null school here means "not visible".
function facts(p: FactSource, school: string | null): string {
  return [
    school && `school: ${school}`,
    p.year && `year: ${p.year}`,
    p.major && `major: ${p.major}`,
    p.skills?.length ? `skills: ${p.skills.join(", ")}` : null,
    p.courses?.length ? `courses: ${p.courses.join(", ")}` : null,
    p.bio && `bio: ${p.bio}`,
    p.goals && `goals: ${p.goals}`,
  ]
    .filter(Boolean)
    .join("; ");
}

// Draft a first DM grounded in what the sender and recipient share. Every
// read goes through the session client (RLS), and the header fields used
// here are exactly what the profile page already exposes to any signed-in
// viewer — no new unrestricted fetch, no hidden field leaks. Metered: free
// caps at 3/day, Pro is effectively unlimited. `locked` now means "out of
// free tries today" (upsell to Pro), not "not Pro". `error` when blocked,
// AI is off, or the call fails.
export async function icebreaker(peerId: string): Promise<IcebreakerResult> {
  if (!peerId) return { error: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: true };
  if (peerId === user.id) return { error: true };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_pro, year, major, bio, goals, skills, courses")
    .eq("id", user.id)
    .single();
  if (!me) return { error: true };
  if (!aiEnabled()) return { error: true };

  const pro = isPro(me);
  const { data: allowed } = await supabase.rpc("use_ai_quota", {
    p_kind: "icebreaker",
    p_cap: pro ? 9999 : 3,
  });
  if (!allowed) return { locked: true };

  // Don't draft to someone the viewer has blocked (a peer blocking the viewer is
  // enforced by RLS on the eventual insert).
  const { data: blocked } = await supabase.rpc("get_blocked_ids");
  if (((blocked ?? []) as string[]).includes(peerId)) return { error: true };

  const [{ data: peer }, { data: mySchool }, { data: peerSchool }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, year, major, bio, goals, skills, courses").eq("id", peerId).maybeSingle(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profile_school").select("school").eq("profile_id", peerId).maybeSingle(),
  ]);
  if (!peer) return { error: true };

  const peerName = peer.display_name ?? peer.username;
  const prompt =
    `Sender (you): ${facts(me, mySchool?.school ?? null)}. ` +
    `Recipient (${peerName}): ${facts(peer, peerSchool?.school ?? null)}.`;

  const text = await generateText(ICEBREAKER_SYSTEM, prompt, { model: modelForTier(pro), maxTokens: 140 });
  return text ? { text } : { error: true };
}

export async function markDmRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("mark_dm_read", { p_conversation_id: conversationId });
  revalidatePath("/", "layout");
  revalidatePath("/messages");
}
