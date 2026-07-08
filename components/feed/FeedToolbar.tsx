"use client";

import { useState } from "react";
import { IconCompose } from "@/components/icons";

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-transparent text-[var(--ink-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-card)] hover:text-[var(--ink)] active:scale-90";

export default function FeedToolbar({
  title,
  search,
  composer,
}: {
  title: React.ReactNode;
  search: React.ReactNode;
  composer: React.ReactNode;
}) {
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        {title}
        <button
          type="button"
          onClick={() => setComposeOpen((o) => !o)}
          aria-label={composeOpen ? "Close composer" : "New post"}
          aria-expanded={composeOpen}
          className={`${iconBtn} shrink-0 ${composeOpen ? "border-[var(--border)] bg-[var(--surface-card)] text-[var(--ink)]" : ""}`}
        >
          <IconCompose />
        </button>
      </div>

      {/* Search is a persistent bar — the primary way to discover people. */}
      <div className="mb-4">{search}</div>
      {composeOpen ? <div className="mb-2">{composer}</div> : null}
    </>
  );
}
