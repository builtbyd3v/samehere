"use client";

import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3a7.35 7.35 0 0 1-11-3.87H1.06v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.07 14.21a7.2 7.2 0 0 1 0-4.42V6.7H1.06a12 12 0 0 0 0 10.6l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.06 6.7l4.01 3.09A7.16 7.16 0 0 1 12 4.75Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.3 9.4 7.88 10.93.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.08.78 2.17v3.22c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

// Shared OAuth entry points for signup + login. Client-side kickoff via the
// browser Supabase client; the actual session exchange happens server-side
// in app/auth/callback/route.ts after the provider redirects back.
export default function OAuthButtons({ variant }: { variant?: "signup" | "login" }) {
  const refFromLink = useSearchParams().get("ref") ?? "";

  async function start(provider: "google" | "github") {
    // Capture before kicking off the redirect: signInWithOAuth calls
    // window.location.assign internally, so anything queued after the
    // await risks being dropped by the navigation.
    if (variant === "signup") {
      posthog.capture("signup_submitted", { has_ref: !!refFromLink, method: "oauth", provider });
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-2.5">
      <button type="button" onClick={() => start("google")} className="btn-ghost w-full py-2 text-[15px] sm:py-2.5">
        <GoogleMark />
        <span>Continue with Google</span>
      </button>
      <button type="button" onClick={() => start("github")} className="btn-ghost w-full py-2 text-[15px] sm:py-2.5">
        <GitHubMark />
        <span>Continue with GitHub</span>
      </button>
    </div>
  );
}

// "or" divider between OAuth and the email form — shared so both forms match.
export function OAuthDivider() {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span>or</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
