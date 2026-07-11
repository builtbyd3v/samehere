import { type NextRequest } from "next/server";
import { verifyUnsubToken } from "@/lib/email-unsub";
import { createAdminClient } from "@/lib/supabase/admin";

// No login required — the whole point is a one-click unsubscribe from the
// email itself. The HMAC token (see lib/email-unsub.ts) is the only auth;
// a tampered or malformed token is rejected before anything is written.
// Plain text response, matching the plain-text emails.
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("u") ?? "";
  const userId = verifyUnsubToken(token);
  if (!userId) {
    return new Response("This unsubscribe link is invalid or expired.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Sanctioned admin-client write (Plan 013 / SESSION DECISION #2): the caller
  // has no session (that's the point of a one-click unsubscribe link), so this
  // can't go through the normal RLS owner-write path. Scoped to exactly the
  // opt-out flag on the token-verified user's own row.
  const admin = createAdminClient();
  await admin.from("profiles").update({ email_digest_opt_out: true }).eq("id", userId);

  return new Response("You're unsubscribed from the daily activity email.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
