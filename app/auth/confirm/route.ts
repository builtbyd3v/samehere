import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email-confirmation landing (the emailRedirectTo target from signUp).
// Supports both Supabase link shapes: the PKCE `?code=` default and the
// `token_hash` + `type` custom-template variant. On success the session
// cookie is set and we redirect into the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Open-redirect guard: only same-origin absolute paths, never protocol-relative.
  const nextParam = searchParams.get("next");
  const dest = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/feed";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  return NextResponse.redirect(`${origin}${ok ? dest : "/login?error=confirm"}`);
}
