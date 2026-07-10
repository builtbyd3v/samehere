import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// service_role client — bypasses RLS. ONE sanctioned use, which writes
// hardcoded, non-user-targeted data (never a value the caller can steer):
//   1. Stripe webhook (app/api/stripe/webhook/route.ts) — is_pro/pro_until/
//      stripe_customer_id, pinned against the session client by guard_profile_privileged.
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
