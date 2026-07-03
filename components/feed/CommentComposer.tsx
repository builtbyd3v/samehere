"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createComment, type CommentState } from "@/app/(app)/post/[id]/actions";

// 50 chars earns a heatmap point — it does NOT gate commenting.
const POINT_AT = 50;

export default function CommentComposer({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(createComment, {});
  const ref = useRef<HTMLFormElement>(null);
  const [len, setLen] = useState(0);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setLen(0);
    }
  }, [state.ok]);

  const qualifies = len >= POINT_AT;

  return (
    <form ref={ref} action={formAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input type="hidden" name="post_id" value={postId} />
      <textarea
        name="content"
        rows={3}
        required
        onChange={(e) => setLen(e.target.value.trim().length)}
        // ⌘/Ctrl+Enter submits, matching the button's disabled rules.
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !pending && len > 0)
            e.currentTarget.form?.requestSubmit();
        }}
        placeholder="Add a comment…"
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className={`text-xs ${qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}>
          {len === 0
            ? `${POINT_AT}+ characters earns a point`
            : qualifies
              ? `${len} characters · earns a point`
              : `${POINT_AT - len} more to earn a point`}
        </span>
        <button
          type="submit"
          disabled={pending || len === 0}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
