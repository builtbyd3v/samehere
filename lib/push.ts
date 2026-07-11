import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";

// ponytail: inline fire-and-forget sends, one recipient at a time via
// Promise.all — fine at current volume. Move to a queue only if send latency
// or fan-out size actually becomes a problem.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT_EMAIL || "mailto:support@samehere.dev";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url: string };

// Sends payload to every device the user has subscribed. Never throws —
// a push failure must never break the action that triggered it (follow,
// comment, reaction). Dead subscriptions (404/410) are deleted as they're
// found.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const supabase = await createClient();
    const { data: subs } = await supabase.rpc("get_push_subscriptions", { p_user_id: userId });
    if (!subs?.length) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
          getPostHogServerClient()?.capture({
            distinctId: userId,
            event: "push_delivered",
            properties: { url: payload.url },
          });
        } catch (err) {
          const statusCode = (err as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.rpc("delete_dead_push_subscription", { p_endpoint: sub.endpoint });
          }
        }
      }),
    );
  } catch {
    // fire-and-forget: swallow so a push outage never bubbles to the caller
  }
}
