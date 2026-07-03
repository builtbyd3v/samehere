"use client";

import { useState } from "react";
import { DEMO_COMPOSER_NUDGES } from "@/lib/landing/demo-data";

const POINT_AT = 150;

export default function LandingComposerDemo() {
  const [text, setText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [nudging, setNudging] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);

  const len = text.trim().length;
  const qualifies = len >= POINT_AT;

  function onNudge() {
    setNudging(true);
    window.setTimeout(() => {
      setHint(DEMO_COMPOSER_NUDGES[nudgeIndex % DEMO_COMPOSER_NUDGES.length]);
      setNudgeIndex((i) => i + 1);
      setNudging(false);
    }, 450);
  }

  function useHint() {
    if (!hint) return;
    setText(hint);
    setHint(null);
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      {hint && (
        <button
          type="button"
          onClick={useHint}
          className="mb-2 block w-full text-left text-xs italic text-[var(--ink-muted)] hover:underline"
        >
          {hint} <span className="not-italic">(click to use)</span>
        </button>
      )}
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share what you're building, learning, or figuring out…"
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
      />

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs ${qualifies ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}>
            {len === 0
              ? `${POINT_AT}+ characters earns a point`
              : qualifies
                ? `${len} characters · earns a point`
                : `${POINT_AT - len} more to earn a point`}
          </span>
          <span className="text-xs font-medium text-[var(--ink-muted)] underline">Add media</span>
          <button
            type="button"
            onClick={onNudge}
            disabled={nudging}
            className="text-xs text-[var(--ink-muted)] underline disabled:opacity-50"
          >
            {nudging ? "Thinking…" : "Need an idea?"}
          </button>
        </div>
        <button
          type="button"
          disabled={len === 0}
          className="btn-inset rounded-md bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </form>
  );
}
