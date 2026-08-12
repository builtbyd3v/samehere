"use client";

import { useState, useTransition } from "react";
import { addFromListing } from "@/app/(app)/applications/actions";

// Optimistic “Track this” on a job listing — mirrors SaveJobButton’s flip-on-
// click / revert-on-error pattern. Once tracked, status lives on /applications.
export default function TrackListingButton({
  listingId,
  initialTracked,
}: {
  listingId: string;
  initialTracked: boolean;
}) {
  const [tracked, setTracked] = useState(initialTracked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function track() {
    if (tracked || pending) return;
    setError(null);
    setTracked(true);
    startTransition(async () => {
      const res = await addFromListing(listingId);
      if (res.error) {
        setTracked(false);
        setError(res.error);
      }
    });
  }

  const on = tracked
    ? "bg-[var(--featured-surface)] text-[var(--blue)]"
    : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]";

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={track}
        disabled={pending || tracked}
        aria-pressed={tracked}
        className={`btn-tap relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition disabled:opacity-60 ${on}`}
      >
        {tracked ? "Tracked" : "Track this"}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
