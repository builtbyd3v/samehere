import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth landing (the redirectTo target from signInWithOAuth in OAuthButtons).
// Google/GitHub redirect here with ?code=; exchange it for a session cookie
// and continue into the app. Mirrors app/auth/confirm/route.ts's code path.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabase = await createClient();
  const ok = !!code && !(await supabase.auth.exchangeCodeForSession(code)).error;

  return NextResponse.redirect(`${origin}${ok ? "/feed" : "/login?error=oauth"}`);
}
