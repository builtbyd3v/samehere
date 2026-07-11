import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth landing (the redirectTo target from signInWithOAuth in OAuthButtons).
// Google/GitHub redirect here with ?code=; exchange it for a session cookie
// and continue into the app. Mirrors app/auth/confirm/route.ts's code path.
//
// New OAuth signups never hit app/auth/confirm/route.ts (which is where the
// email path routes first-timers to /onboarding), so without this check they
// skipped the onboarding wizard entirely. onboarded_at is null only for
// users who haven't finished/skipped onboarding yet (existing users were
// backfilled in 20260716210000_backfill_onboarded_at.sql), so it's a safe
// signal here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : { data: null, error: new Error("missing code") };
  const ok = !error;

  let dest = "/feed";
  if (ok && data?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", data.user.id)
      .single();
    if (profile && profile.onboarded_at === null) {
      dest = "/onboarding";
    }
  }

  return NextResponse.redirect(`${origin}${ok ? dest : "/login?error=oauth"}`);
}
