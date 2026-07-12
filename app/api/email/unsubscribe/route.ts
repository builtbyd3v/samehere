import { type NextRequest } from "next/server";
import { verifyUnsubToken } from "@/lib/email-unsub";
import { createAdminClient } from "@/lib/supabase/admin";

// No login required — the whole point is a one-click unsubscribe from the
// email itself. The HMAC token (see lib/email-unsub.ts) is the only auth;
// a tampered or malformed token is rejected before anything is written.
// Plain text response, matching the plain-text emails.
async function optOut(token: string): Promise<Response> {
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
  const { error } = await admin.from("profiles").update({ email_digest_opt_out: true }).eq("id", userId);
  if (error) {
    return new Response("Could not process unsubscribe, try again.", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("You're unsubscribed from the daily activity email.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("u") ?? "";
  return optOut(token);
}

// RFC 8058 one-click unsubscribe: mail clients that support
// List-Unsubscribe-Post send a POST here instead of following the link, so it
// must opt out directly too, same as GET — not a confirm page either way.
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("u") ?? "";
  return optOut(token);
}
