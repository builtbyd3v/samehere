"use client";

import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">Something went wrong</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          Give it another try.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
