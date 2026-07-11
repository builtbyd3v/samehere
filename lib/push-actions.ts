"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { notificationLabel } from "@/lib/notifications";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Persists a device's push subscription under the caller's own RLS row —
// same pattern as any other owner-write insert, no elevated access needed.
export async function subscribeToPush(sub: PushSubscriptionInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    user_id: user.id,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
  if (error) return { error: "Could not save your subscription. Try again." };
  return {};
}

// Disabling push = deleting every subscription row this user owns (RLS pins
// the delete to their own rows). No separate preference column.
export async function unsubscribeFromPush(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
}

export async function hasPushSubscription(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true })
    .eq("user_id", user.id);
  return (count ?? 0) > 0;
}

// Called right after a notification-causing action succeeds (follow,
// comment, reaction) — see FollowButton.tsx, ReactionRow.tsx,
// app/(app)/post/[id]/actions.ts. Fire-and-forget: callers do not await this
// for UI purposes, and every failure mode here is swallowed by
// sendPushToUser so it can never break the action that triggered it.
//
// DM and @mention pushes are NOT wired — their creation sites
// (app/(app)/messages/actions.ts, app/(app)/feed/actions.ts) are owned by
// other in-flight plans this wave; add a call here once those land.
export async function notifyPush(
  type: "follow" | "follow_request" | "comment" | "reaction",
  opts: { targetUserId?: string; postId?: string },
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor) return;

  let recipientId: string | null = null;
  let url = "/";

  if (type === "follow" || type === "follow_request") {
    recipientId = opts.targetUserId ?? null;
  } else if (opts.postId) {
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", opts.postId).single();
    recipientId = post?.user_id ?? null;
    url = `/post/${opts.postId}`;
  }
  if (!recipientId || recipientId === actor.id) return;

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", actor.id)
    .single();
  if (!actorProfile) return;
  const actorName = actorProfile.display_name || actorProfile.username;
  if (type === "follow" || type === "follow_request") url = `/profile/${actorProfile.username}`;

  await sendPushToUser(recipientId, {
    title: "samehere",
    body: notificationLabel(type, actorName),
    url,
  });
}
