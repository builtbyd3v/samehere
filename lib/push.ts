import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
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
//
// The recipient is a DIFFERENT user than the actor whose session triggered
// this, so reading their subscriptions crosses the owner-only
// push_subscriptions RLS. This runs only from server-only code reached
// through the "use server" boundary (never a client module), so it uses the
// sanctioned admin client (see lib/supabase/admin.ts) exactly like the digest
// cron's cross-user recipient read — NOT a definer RPC any authenticated
// client could call for an arbitrary user_id.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
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
          const body = (err as { body?: unknown } | null)?.body;
          console.error("[push] send failed", { statusCode, body });
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }),
    );
  } catch {
    // fire-and-forget: swallow so a push outage never bubbles to the caller
  }
}
