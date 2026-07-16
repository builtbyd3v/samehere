"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AvatarImage from "@/components/ui/AvatarImage";
import { IconCompose } from "@/components/icons";

const PostComposer = dynamic(() => import("@/components/feed/PostComposer"), {
  loading: () => (
    <div
      aria-hidden
      className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]"
    />
  ),
});

type ComposerToggleProps = {
  isPro: boolean;
  avatarUrl: string | null;
  isSuspended: boolean;
};

export default function ComposerToggle({ isPro, avatarUrl, isSuspended }: ComposerToggleProps) {
  const [open, setOpen] = useState(false);

  // Suspension blocks the post INSERT at the RLS layer, so opening the
  // composer can only end in a failed submit. The shell banner already
  // explains why; just don't render the trigger.
  if (isSuspended) return null;

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
