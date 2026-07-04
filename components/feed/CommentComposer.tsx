"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createComment, type CommentState } from "@/app/(app)/post/[id]/actions";
import { createQuoteComment } from "@/app/(app)/quote/[id]/actions";
import { useSubmitShortcut } from "@/lib/useSubmitShortcut";
import { submitShortcutLabel } from "@/lib/keyboard";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import MentionTextarea from "@/components/ui/MentionTextarea";

const POINT_AT = 50;
const MAX = TEXT_LIMITS.comment;

export default function CommentComposer({ postId, quoteId }: { postId?: string; quoteId?: string }) {
  const action = quoteId ? createQuoteComment : createComment;
  const [state, formAction, pending] = useActionState<CommentState, FormData>(action, {});
  const [, startSubmit] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [len, setLen] = useState(0);
  const [shortcutLabel, setShortcutLabel] = useState("");

  useEffect(() => setShortcutLabel(submitShortcutLabel()), []);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setContent("");
      setLen(0);
    }
  }, [state.ok]);

  const submit = useCallback(() => {
    if (!ref.current || pending || len === 0) return;
    startSubmit(() => formAction(new FormData(ref.current!)));
  }, [formAction, pending, len]);

  useSubmitShortcut(textareaRef, submit, !pending && len > 0);

  const qualifies = len >= POINT_AT;

  return (
    <form ref={ref} action={formAction} className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
      {quoteId ? (
        <input type="hidden" name="repost_id" value={quoteId} />
      ) : (
        <input type="hidden" name="post_id" value={postId ?? ""} />
      )}
      <MentionTextarea
        textareaRef={textareaRef}
        name="content"
        rows={3}
        required
        maxLength={MAX}
        value={content}
        onChange={(v) => {
          setContent(v);
          setLen(v.trim().length);
        }}
        placeholder={
          shortcutLabel
            ? `Add a comment… Type @ to mention (${shortcutLabel} to post)`
            : "Add a comment… Type @ to mention"
        }
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span
          className={`text-xs ${
            len >= MAX ? "text-[#c0392b] dark:text-[#e88]" : qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"
          }`}
        >
          {len === 0
            ? `${POINT_AT}+ characters earns a point`
            : len >= MAX
              ? `${len}/${MAX}`
              : qualifies
                ? `${len}/${MAX} · earns a point`
                : `${len}/${MAX} · ${POINT_AT - len} more to earn a point`}
        </span>
        <button
          type="submit"
          disabled={pending || len === 0 || len > MAX}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
