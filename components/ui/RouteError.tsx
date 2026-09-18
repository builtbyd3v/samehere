"use client";

import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";
import { CTA, ERROR } from "@/lib/copy-voice";

export default function RouteError({
  error,
  reset,
  homeHref = "/",
  homeLabel = "Back home",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="card p-10 text-center" role="alert">
        <h1 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">{ERROR.title}</h1>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{ERROR.description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            {CTA.tryAgain}
          </button>
          <Link href={homeHref} className="btn-ghost">
            {homeLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
