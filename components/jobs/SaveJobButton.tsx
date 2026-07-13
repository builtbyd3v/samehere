"use client";

import { useState, useTransition } from "react";
import { IconBookmark } from "@/components/icons";
import { toggleJobSave } from "@/app/(app)/jobs/actions";

// Optimistic save toggle for one listing -- mirrors toggleBookmark in
// components/feed/ReactionRow.tsx (flip state immediately, revert on error).
// Rendered on the board row and the detail action row; `compact` drops the
// label so it fits the tight board-row action bar.
export default function SaveJobButton({
  listingId,
  initialSaved,
  compact = false,
}: {
  listingId: string;
  initialSaved: boolean;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleJobSave(listingId, next);
      if (res.error) setSaved(!next);
    });
  }

  const on = saved
    ? "bg-[var(--featured-surface)] text-[var(--blue)]"
    : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Unsave listing" : "Save listing"}
      className={`btn-tap relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition disabled:opacity-60 ${on}`}
    >
      <IconBookmark on={saved} />
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
