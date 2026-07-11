"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconCompose } from "@/components/icons";

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-transparent text-[var(--ink-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-card)] hover:text-[var(--ink)] active:scale-90";

export default function FeedToolbar({
  title,
  search,
  composer,
  initialComposeOpen = false,
}: {
  title: React.ReactNode;
  search: React.ReactNode;
  composer: React.ReactNode;
  initialComposeOpen?: boolean;
}) {
  const [composeOpen, setComposeOpen] = useState(initialComposeOpen);
  const searchParams = useSearchParams();

  // A soft nav to ?compose=1 changes the param without remounting this client
  // component, so open the composer in response to the param, not just from
  // the initial state.
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
  if (searchParams !== prevSearchParams) {
    setPrevSearchParams(searchParams);
    if (searchParams.get("compose") === "1") setComposeOpen(true);
  }

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
      {composeOpen ? (
        <div className="mb-2 animate-[modal-in_200ms_var(--ease-out)] motion-reduce:animate-none">{composer}</div>
      ) : null}
    </>
  );
}
