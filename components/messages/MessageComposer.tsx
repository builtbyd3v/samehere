"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMessage, type SendMessageState } from "@/app/(app)/messages/actions";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction, pending] = useActionState<SendMessageState, FormData>(sendMessage, {});
  const [shortcutLabel, setShortcutLabel] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setShortcutLabel(submitShortcutLabel()), []);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state.ok]);

  useSubmitShortcut(textareaRef, () => ref.current?.requestSubmit(), !pending);

  return (
    <form ref={ref} action={formAction} className="border-t border-[var(--border)] bg-[var(--surface-card)] p-4">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          name="content"
          rows={2}
          required
          placeholder={
            shortcutLabel ? `Message… (${shortcutLabel} to send)` : "Message…"
          }
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-inset shrink-0 self-end rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--canvas)] disabled:opacity-50"
        >
          {pending ? "…" : "Send"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {state.error}
        </p>
      )}
    </form>
  );
}
