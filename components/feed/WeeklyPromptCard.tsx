"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Dismiss is keyed by the ISO week, so dismissing hides only THIS week's prompt;
// next week's (a new weekKey) shows again. Start hidden to avoid showing it to
// someone who already dismissed (no flash before the localStorage read).
const DISMISS_KEY = "weekly-prompt-dismissed";

export default function WeeklyPromptCard({ prompt, weekKey }: { prompt: string; weekKey: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === weekKey);
  }, [weekKey]);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, weekKey);
    setDismissed(true);
  }

  return (
    <div className="card mb-6 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-faint)]">This week</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this week's prompt"
          className="-mt-1 -mr-1 shrink-0 rounded-full p-1 text-lg leading-none text-[var(--ink-faint)] transition hover:text-[var(--ink)]"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-[var(--ink)]">{prompt}</p>
      <Link href="/feed?compose=1" className="btn-primary mt-3 inline-flex !py-1.5 text-sm">
        Post about this
      </Link>
    </div>
  );
}
