"use client";

import { useState } from "react";
import { IconCompose, IconSearch } from "@/components/icons";

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-transparent text-[var(--ink-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-card)] hover:text-[var(--ink)] active:scale-90";

export default function FeedToolbar({
  title,
  initialSearchOpen = false,
  search,
  composer,
}: {
  title: React.ReactNode;
  initialSearchOpen?: boolean;
  search: React.ReactNode;
  composer: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(initialSearchOpen);
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        {title}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? "Close search" : "Search students"}
            aria-expanded={searchOpen}
            className={`${iconBtn} ${searchOpen ? "border-[var(--border)] bg-[var(--surface-card)] text-[var(--ink)]" : ""}`}
          >
            <IconSearch />
          </button>
          <button
            type="button"
            onClick={() => setComposeOpen((o) => !o)}
            aria-label={composeOpen ? "Close composer" : "New post"}
            aria-expanded={composeOpen}
            className={`${iconBtn} ${composeOpen ? "border-[var(--border)] bg-[var(--surface-card)] text-[var(--ink)]" : ""}`}
          >
            <IconCompose />
          </button>
        </div>
      </div>

      {searchOpen ? <div className="mb-6">{search}</div> : null}
      {composeOpen ? <div className="mb-6">{composer}</div> : null}
    </>
  );
}
