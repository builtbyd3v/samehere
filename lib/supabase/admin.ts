import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// service_role client — bypasses RLS. Used ONLY by the Stripe webhook
// (app/api/stripe/webhook/route.ts) to write is_pro/pro_until/stripe_customer_id,
// which `guard_profile_privileged` pins against the session client. Never
// import this into a user-request code path (Server Action, page, route
// handler serving a browser request). Checked lazily (not at module load) so a
// missing key can't break the build — only a live webhook call fails.
export const createAdminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
