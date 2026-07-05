"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type SendMessageState } from "@/app/(app)/messages/actions";
import { IconSend } from "@/components/icons";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { TEXT_LIMITS } from "@/lib/utils/validation";

const MAX = TEXT_LIMITS.message;

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction, pending] = useActionState<SendMessageState, FormData>(sendMessage, {});
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <form ref={ref} action={formAction} className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 sm:px-4">
      <input type="hidden" name="conversation_id" value={conversationId} />
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
        <p role="alert" className="mt-2 px-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {state.error}
        </p>
      )}
    </form>
  );
}
