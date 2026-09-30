import { NextResponse, type NextRequest } from "next/server";
import { parseRef, REF_COOKIE } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

// OAuth landing (the redirectTo target from signInWithOAuth in OAuthButtons).
// Google/GitHub redirect here with ?code=; exchange it for a session cookie
// and continue into the app. Confirmation, OAuth, and signup all enter /feed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : { error: new Error("missing code") };
  const ok = !error;

  // Plan 016: OAuth accounts are created already confirmed, so the email-confirm
  // trigger never attributes them. Claim the ref set by OAuthButtons; the RPC
  // refuses old accounts, self-referral and second claims. Never blocks login.
  if (ok) {
    const ref = parseRef(request.cookies.get(REF_COOKIE)?.value);
    if (ref) {
      const { error: claimError } = await supabase.rpc("claim_signup_referral", { p_ref: ref });
      if (claimError) console.error("claim_signup_referral failed", claimError.code);
    }
  }
  const res = NextResponse.redirect(`${origin}${ok ? "/feed" : "/login?error=oauth"}`);
  res.cookies.delete(REF_COOKIE);
  return res;
}
