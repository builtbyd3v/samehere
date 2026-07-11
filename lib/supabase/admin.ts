import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// service_role client — bypasses RLS. FOUR sanctioned uses, none of which
// write a value the caller can steer:
//   1. Stripe webhook (app/api/stripe/webhook/route.ts) — is_pro/pro_until/
//      stripe_customer_id, pinned against the session client by guard_profile_privileged.
//   2. Cron digest (app/api/cron/unread-digest/route.ts) — read-only RPC call
//      (list_unread_digest_recipients), no session exists (Vercel Cron caller).
//   3. Unsubscribe (app/api/email/unsubscribe/route.ts) — single hardcoded
//      boolean write (email_digest_opt_out) to the row an HMAC-verified token
//      names; no session exists (one-click link from an email).
//   4. Push send (lib/push.ts) — cross-user READ of a notification recipient's
//      push_subscriptions (+ prune of dead endpoints), reached only through the
//      "use server" boundary; the recipient's user_id is derived server-side
//      from the triggering action, never supplied by the client.
// (A second use, the weekly-prompt cache, was removed with that feature.)
// Do NOT add a use that writes user-controllable data or targets a user-chosen
// row — that class of write belongs in a session-client path under RLS, or a
// SECURITY DEFINER function that derives its own values. Checked lazily (not at
// module load) so a missing key can't break the build.
export const createAdminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
