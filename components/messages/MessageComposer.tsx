"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sendMessage, icebreaker, type SendMessageState } from "@/app/(app)/messages/actions";
import { IconSend } from "@/components/icons";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { TEXT_LIMITS } from "@/lib/utils/validation";

const MAX = TEXT_LIMITS.message;

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

export default function MessageComposer({
  conversationId,
  peerId,
  viewerIsPro = false,
  empty = false,
}: {
  conversationId: string;
  peerId?: string;
  viewerIsPro?: boolean;
  empty?: boolean;
}) {
  const [state, formAction, pending] = useActionState<SendMessageState, FormData>(sendMessage, {});
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [drafting, startDraft] = useTransition();
  const [draftNotice, setDraftNotice] = useState<"locked" | "error" | null>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.focus();
      }
    }
  }, [state.ok]);

  useSubmitShortcut(textareaRef, () => ref.current?.requestSubmit(), !pending);

  // Available to everyone: drop an AI-drafted intro into the (editable)
  // composer. Free users get a metered taste (3/day); Pro is unlimited —
  // gating happens server-side in the action, not here.
  function onDraftIntro() {
    if (!peerId || drafting) return;
    setDraftNotice(null);
    startDraft(async () => {
      const res = await icebreaker(peerId);
      if ("text" in res) {
        const el = textareaRef.current;
        if (el) {
          el.value = res.text;
          resizeTextarea(el);
          el.focus();
        }
      } else if ("locked" in res) {
        setDraftNotice("locked");
      } else {
        setDraftNotice("error");
      }
    });
  }

  return (
    <form ref={ref} action={formAction} className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 sm:px-4">
      <input type="hidden" name="conversation_id" value={conversationId} />
      {empty && peerId && (
        <div className="mb-2 px-1">
          <button
            type="button"
            onClick={onDraftIntro}
            disabled={drafting}
            className="text-xs font-medium text-[var(--blue)] underline disabled:opacity-50"
          >
            {drafting ? "Drafting…" : "✦ Draft an intro"}
            {viewerIsPro && <span className="text-[var(--ink-faint)]"> (unlimited)</span>}
          </button>
          {draftNotice === "locked" && (
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Out of free suggestions today.{" "}
              <Link href="/pro" className="font-medium text-[var(--blue)] underline">
                Go Pro for unlimited
              </Link>
              .
            </p>
          )}
          {draftNotice === "error" && (
            <p className="mt-1 text-xs text-[var(--ink-faint)]">Couldn&apos;t draft an intro. Try again.</p>
          )}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-full border border-[var(--border)] bg-[var(--canvas)] px-4 py-2">
        <textarea
          ref={textareaRef}
          name="content"
          rows={1}
          required
          maxLength={MAX}
          placeholder="Write a message"
          onInput={(e) => resizeTextarea(e.currentTarget)}
          className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="btn-inset mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--canvas)] transition active:scale-[0.94] active:opacity-80 disabled:opacity-40 disabled:active:scale-100"
        >
          <IconSend />
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 px-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
