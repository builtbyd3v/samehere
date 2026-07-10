// Deno edge function. Purges a user's account: profiles row (cascades all
// children) + the auth.users row. Authorization is the verified JWT's uid —
// NEVER trust a client-supplied id.
// ponytail: edge fn does profile+auth delete in one verified place; no separate SQL definer.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the token ourselves — the uid it resolves to is the ONLY id we act on.
  const anonClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(jwt);
  if (userError || !user) return json({ error: "Invalid or expired session" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Auth user FIRST: profiles.id FK is ON DELETE CASCADE (20260712100000), so
  // this one call removes the profile and all its children atomically. The old
  // order (profile first) could strand a live auth user with no profile if the
  // second call failed — an unrecoverable half-deleted account.
  const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
  if (authError) return json({ error: "Failed to delete auth user" }, 500);

  // Defensive no-op when the cascade did its job; covers any future FK change.
  const { error: profileError } = await adminClient.from("profiles").delete().eq("id", user.id);
  if (profileError) return json({ error: "Failed to delete account data" }, 500);

  return json({ ok: true }, 200);
});
