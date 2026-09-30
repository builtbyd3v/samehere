"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import { getPostHogServerClient } from "@/lib/posthog-server";

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

// Candidates for the "New group" picker: accounts that follow the viewer
// (accepted), minus anyone blocked either direction. Mirrors the RPC rule:
// create_group_conversation and add_group_member only accept members who
// follow the caller.
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
      .select("follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, is_pro)")
      .eq("following_id", user.id)
      .eq("status", "accepted"),
  ]);

  const blockedSet = new Set((blocked ?? []) as string[]);
  return (rows ?? [])
    .map((r) => (Array.isArray(r.follower) ? r.follower[0] : r.follower))
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

  getPostHogServerClient()?.capture({
    distinctId: user.id,
    event: "group_created",
    properties: { size: new Set([user.id, ...memberIds]).size },
  });

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

export type GroupMemberActionResult = { error?: string };

// Thin wrappers around the add_group_member / remove_group_member definer
// RPCs (20260716200000_group_membership.sql). "Leave" has no equivalent
// wrapper here -- the existing leaveConversation action below already
// covers it for any conversation kind, group included.
export async function addGroupMember(
  conversationId: string,
  memberId: string
): Promise<GroupMemberActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("add_group_member", {
    p_conversation_id: conversationId,
    p_member_id: memberId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/messages/${conversationId}`);
  return {};
}

export async function removeGroupMember(
  conversationId: string,
  memberId: string
): Promise<GroupMemberActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("remove_group_member", {
    p_conversation_id: conversationId,
    p_member_id: memberId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/messages/${conversationId}`);
  return {};
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
  revalidatePath("/feed");
  revalidatePath("/messages");
}
