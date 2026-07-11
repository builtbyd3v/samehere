"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { ICEBREAKER_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import { TEXT_LIMITS } from "@/lib/utils/validation";

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

export type MessageUserResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
};

// Candidates for the "New group" picker: accounts the viewer follows
// (accepted), minus anyone blocked either direction. Followed-only is a UI
// choice, not an RLS/RPC requirement -- create_group_conversation itself only
// hard-rejects a blocked creator<->member pair (see plan 025 NOTES).
export async function listFollowedForGroup(): Promise<MessageUserResult[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: blocked }, { data: rows }] = await Promise.all([
    supabase.rpc("get_blocked_ids"),
    supabase
      .from("follows")
      .select("following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url, is_pro)")
      .eq("follower_id", user.id)
      .eq("status", "accepted"),
  ]);

  const blockedSet = new Set((blocked ?? []) as string[]);
  return (rows ?? [])
    .map((r) => (Array.isArray(r.following) ? r.following[0] : r.following))
    .filter((p): p is MessageUserResult => !!p && !blockedSet.has(p.id));
}

export type CreateGroupResult = { error: string } | { conversationId: string };

export async function createGroupConversation(title: string, memberIds: string[]): Promise<CreateGroupResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversationId, error } = await supabase.rpc("create_group_conversation", {
    p_title: title,
    p_member_ids: memberIds,
  });

  if (error || !conversationId) {
    return { error: error?.message ?? "Could not create group" };
  }

  return { conversationId };
}

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
      .select("id, username, display_name, avatar_url, is_pro")
      .or(`username.ilike.${sanitized}%,display_name.ilike.%${sanitized}%`)
      .neq("id", user.id)
      .limit(8),
  ]);

  const blockedSet = new Set((blocked ?? []) as string[]);
  return (profiles ?? []).filter((p) => !blockedSet.has(p.id));
}

export type IcebreakerResult = { locked: true } | { text: string } | { error: true };

type FactSource = {
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
};

// Compact fact list for the prompt. school comes from profile_school, whose own
// RLS already honors hide_school, so a null school here means "not visible".
// Bundled into one untrusted block — these are free-text fields the profile
// owner wrote, never to be read as instructions (see lib/ai-prompts.ts).
function facts(p: FactSource, school: string | null): string {
  return untrusted(
    [
      school && `school: ${school}`,
      p.year && `year: ${p.year}`,
      p.major && `major: ${p.major}`,
      p.bio && `bio: ${p.bio}`,
      p.goals && `goals: ${p.goals}`,
    ]
      .filter(Boolean)
      .join("; ")
  );
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
    .select("is_pro, pro_until, year, major, bio, goals")
    .eq("id", user.id)
    .single();
  if (!me) return { error: true };
  if (!aiEnabled()) return { error: true };

  const pro = isPro(me);
  const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "icebreaker" });
  if (!allowed) return { locked: true };

  // Don't draft to someone the viewer has blocked (a peer blocking the viewer is
  // enforced by RLS on the eventual insert).
  const { data: blocked } = await supabase.rpc("get_blocked_ids");
  if (((blocked ?? []) as string[]).includes(peerId)) return { error: true };

  const [{ data: peer }, { data: mySchool }, { data: peerSchool }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, year, major, bio, goals").eq("id", peerId).maybeSingle(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profile_school").select("school").eq("profile_id", peerId).maybeSingle(),
  ]);
  if (!peer) return { error: true };

  const peerName = peer.display_name ?? peer.username;
  const prompt =
    `Sender (you): ${facts(me, mySchool?.school ?? null)}. ` +
    `Recipient (${untrusted(peerName)}): ${facts(peer, peerSchool?.school ?? null)}.`;

  const text = await generateText(ICEBREAKER_SYSTEM, prompt, { model: modelForTier(pro), maxTokens: 140 });
  return text ? { text } : { error: true };
}

export async function leaveConversation(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("leave_conversation", { p_conversation_id: conversationId });
  revalidatePath("/messages");
  redirect("/messages");
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
