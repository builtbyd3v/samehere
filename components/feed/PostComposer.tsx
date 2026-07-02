"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, type ComposerState } from "@/app/(app)/feed/actions";

const MIN = 150;

export default function PostComposer() {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(createPost, {});
  const ref = useRef<HTMLFormElement>(null);
  const [len, setLen] = useState(0);

  // Reset the form and counter after a successful post.
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setLen(0);
    }
  }, [state.ok]);

  const short = len > 0 && len < MIN;

  return (
    <form ref={ref} action={formAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <textarea
        name="content"
        rows={4}
        required
        minLength={MIN}
        onChange={(e) => setLen(e.target.value.trim().length)}
        placeholder="Share what you're building, learning, or figuring out…"
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[#c0392b] dark:text-[#e88]">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className={`text-xs ${short ? "text-[#c0392b] dark:text-[#e88]" : "text-[var(--ink-muted)]"}`}>
          {len < MIN ? `${len} / ${MIN} min` : `${len} characters`}
        </span>
        <button
          type="submit"
          disabled={pending || len < MIN}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
