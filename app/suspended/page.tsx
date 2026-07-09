import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = {
  title: "Account suspended",
};

// Reachable while suspended (see isPublic in lib/supabase/middleware.ts) and
// while logged out — a static notice, nothing gated behind it. The log-out
// form posts back to this same public path, so signing out never re-enters
// the suspension redirect.
export default function SuspendedPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-20">
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
          Your account is suspended
        </p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          We suspended this account for violating our{" "}
          <a href="/terms" className="text-[var(--ink)] underline underline-offset-4">
            Terms of Service
          </a>
          . You can&apos;t post, comment, follow, react, or message while suspended.
        </p>
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          Think this is a mistake?{" "}
          <a
            href="mailto:support@samehere.dev?subject=Suspension%20appeal"
            className="text-[var(--ink)] underline underline-offset-4"
          >
            Email support@samehere.dev
          </a>{" "}
          to appeal.
        </p>
        <form action={signOut} className="mt-6 flex items-center justify-center">
          <button type="submit" className="btn-primary">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
