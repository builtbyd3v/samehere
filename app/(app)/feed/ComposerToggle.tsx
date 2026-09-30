"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { Plus, X } from "lucide-react";
import AvatarBase from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { COMPOSER_LABELS, COMPOSER_LABEL_COPY, CONTEXT_LABEL_DOT, type ContextLabel } from "@/lib/context-label";

const PostComposer = dynamic(() => import("@/components/feed/PostComposer"), {
  loading: () => (
    <div aria-hidden className="h-32 motion-safe:animate-pulse rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)]" />
  ),
});

type ComposerToggleProps = {
  isPro: boolean;
  avatarUrl: string | null;
  username: string;
  isSuspended: boolean;
};

export default function ComposerToggle({ isPro, avatarUrl, username, isSuspended }: ComposerToggleProps) {
  const [open, setOpen] = useState<null | { label: ContextLabel | null }>(null);

  function openWith(label: ContextLabel | null) {
    setOpen({ label });
    if (label) posthog.capture("composer_shortcut_used", { label });
  }

  if (isSuspended) return null;

  if (open) {
    return (
      <div className="border-b border-[var(--hairline)] py-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-sm font-medium text-[var(--muted)]">New post</span>
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close composer"
            className="grid size-7 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--fill-2)] hover:text-[var(--ink)] active:scale-[0.96]"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <PostComposer isPro={isPro} autoFocus initialLabel={open.label} />
      </div>
    );
  }

  return (
    <>
      <div className="hidden gap-3.5 border-b border-[var(--hairline)] py-5 lg:flex">
        <AvatarBase src={avatarUrl} seed={username || "you"} name={username} className="size-9 shrink-0 rounded-full text-[13px]" pro={isPro} />
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <button
            type="button"
            onClick={() => openWith(null)}
            className="w-full pt-[7px] text-left text-base text-[var(--faint)] hover:text-[var(--muted)]"
          >
            Share what you are building, learning, or stuck on
          </button>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {COMPOSER_LABELS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => openWith(key)}
                  aria-label={`New ${COMPOSER_LABEL_COPY[key]} post`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] px-2.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] active:scale-[0.96]"
                >
                  <span aria-hidden className={`size-1.5 rounded-full ${CONTEXT_LABEL_DOT[key]}`} />
                  {COMPOSER_LABEL_COPY[key]}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => openWith(null)}>
              Post
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="New post"
        onClick={() => openWith(null)}
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-40 grid size-[52px] place-items-center rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.7)] active:scale-[0.94] motion-reduce:active:scale-100 lg:hidden"
      >
        <Plus size={20} strokeWidth={2} aria-hidden />
      </button>
    </>
  );
}
