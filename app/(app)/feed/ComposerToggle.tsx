"use client";

import { useState } from "react";
import PostComposer from "@/components/feed/PostComposer";
import AvatarImage from "@/components/ui/AvatarImage";
import { IconCompose } from "@/components/icons";

export default function ComposerToggle({ isPro, avatarUrl }: { isPro: boolean; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="animate-[modal-in_180ms_var(--ease-out)] motion-reduce:animate-none">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-sm font-medium text-[var(--ink-muted)]">New post</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close composer"
            className="btn-tap grid h-7 w-7 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <PostComposer isPro={isPro} autoFocus />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="New post"
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 text-left transition hover:border-[var(--border-strong)] sm:p-5"
    >
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] bg-[var(--featured-surface)]" aria-hidden />
      )}
      <span className="flex-1 text-[16px] text-[var(--ink-faint)]">Share what you&apos;re building…</span>
      <span className="shrink-0 text-[var(--ink-muted)]" aria-hidden>
        <IconCompose />
      </span>
    </button>
  );
}
