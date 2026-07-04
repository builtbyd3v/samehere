"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import MentionTextarea from "@/components/ui/MentionTextarea";
import { submitShortcutLabel } from "@/lib/keyboard";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";

export default function QuoteRepostModal({
  post,
  viewerId,
  open,
  onClose,
  onDone,
}: {
  post: FeedPost;
  viewerId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortcutLabel, setShortcutLabel] = useState("");
  const [supabase] = useState(createClient);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
      ref.current?.focus();
    }
  }, [open]);

  useEffect(() => setShortcutLabel(submitShortcutLabel()), []);

  const submit = useCallback(async () => {
    const quote = text.trim();
    if (!quote) return setError("Write something for your quote.");
    if (quote.length > 500) return setError("Quotes are capped at 500 characters.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("reposts").insert({
      post_id: post.id,
      user_id: viewerId,
      quote_text: quote,
    });
    setBusy(false);
    if (err) return setError("Could not quote-repost. Try again.");
    onDone();
    onClose();
  }, [text, supabase, post.id, viewerId, onDone, onClose]);

  useSubmitShortcut(ref, submit, open && !busy && text.trim().length > 0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-lg sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Quote repost</h2>
        <MentionTextarea
          textareaRef={ref}
          rows={3}
          value={text}
          onChange={setText}
          placeholder="Add your take… Type @ to mention"
          className="mt-3 w-full resize-y bg-transparent text-[16px] leading-[1.55] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        {shortcutLabel && (
          <p className="mt-1 text-xs text-[var(--ink-faint)]">{shortcutLabel} to post</p>
        )}

        <div className="mt-4 pointer-events-none opacity-90">
          <PostCard post={post} viewerId={viewerId} variant="embedded" />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-[#c0392b] dark:text-[#e88]">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--ink-muted)] hover:bg-[var(--featured-surface)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] disabled:opacity-50"
          >
            {busy ? "Posting…" : "Quote repost"}
          </button>
        </div>
      </div>
    </div>
  );
}
