import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { sendEmail } from "@/lib/email";

// Email-confirmation landing (the emailRedirectTo target from signUp).
// Supports both Supabase link shapes: the PKCE `?code=` default and the
// `token_hash` + `type` custom-template variant. On success the session
// cookie is set and we redirect into the app.
//
// This route is also the target of the password-recovery link
// (ForgotPasswordForm redirects here with `?next=/update-password`) — the
// `code`/`token_hash` exchange looks identical for both flows, so `next` is
// the one reliable signal that this is recovery, not signup confirmation.
// Only the no-`next` (signup) path should ever fire the welcome email.
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
  let user: User | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    user = data?.user ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    user = data?.user ?? null;
  }

  // Fire-and-forget: a failed welcome email must never break the redirect.
  // `code`/`token_hash` are single-use, so a re-click of the same link fails
  // exchange (ok=false) and can't re-send — natural idempotency, no dedupe needed.
  // Type-gated: only a signup confirmation (PKCE `code`, or `type=signup`/`email`)
  // may welcome — an `email_change`/`invite` token_hash link with no `next` must not.
  const isSignupConfirm = !nextParam && (Boolean(code) || type === "signup" || type === "email");
  if (ok && user?.email && isSignupConfirm) {
    sendEmail({
      to: user.email,
      from: "noreply@samehere.dev",
      subject: "welcome to samehere",
      text: "hey — you're in. samehere is small right now, on purpose: every person here was invited. three things worth doing first: finish your profile, post something real, and join a club at https://samehere.dev/community. — Dev",
    }).catch(() => {});
  }

  if (ok && user) {
    getPostHogServerClient()?.capture({ distinctId: user.id, event: "email_confirmed" });
  }

  return NextResponse.redirect(`${origin}${ok ? dest : "/login?error=confirm"}`);
}
