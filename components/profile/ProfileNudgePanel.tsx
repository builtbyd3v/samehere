"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { profileNudge } from "@/app/(app)/profile/edit/actions";
import {
  gapFieldId,
  gapLabel,
  getProfileGaps,
  type ProfileForCompletion,
} from "@/lib/profile-completion";

export default function ProfileNudgePanel({ profile }: { profile: ProfileForCompletion }) {
  const gaps = getProfileGaps(profile);
  const [hint, setHint] = useState<string | null>(null);
  const [overCap, setOverCap] = useState(false);
  const [nudging, startNudge] = useTransition();

  if (gaps.length === 0) return null;

  function onNudge() {
    startNudge(async () => {
      const res = await profileNudge();
      if ("overCap" in res) {
        setOverCap(true);
        setHint(null);
      } else {
        setHint(res.text);
        setOverCap(false);
      }
    });
  }

  function focusGap() {
    const target = gapFieldId(gaps[0]);
    const el = target ? document.getElementById(target) : document.getElementById("avatar-upload");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Profile completeness</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {gaps.length} field{gaps.length === 1 ? "" : "s"} left, stronger profiles get better follow suggestions.
          </p>
        </div>
        <button
          type="button"
          onClick={onNudge}
          disabled={nudging}
          className="shrink-0 text-xs text-[var(--ink-muted)] underline active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {nudging ? "Thinking…" : "Need a suggestion?"}
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {gaps.map((g) => (
          <li
            key={g}
            className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-0.5 text-xs text-[var(--ink-muted)]"
          >
            {gapLabel(g)}
          </li>
        ))}
      </ul>

      {hint && (
        <button
          type="button"
          onClick={focusGap}
          className="mt-3 block w-full text-left text-sm italic text-[var(--ink-muted)] hover:underline active:scale-[0.99]"
        >
          {hint} <span className="not-italic">(click to jump to field)</span>
        </button>
      )}

      {overCap && (
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          You&apos;re out of AI suggestions for today.{" "}
          <Link href="/pro" className="font-medium text-[var(--ink)] underline">
            Upgrade for unlimited + smarter AI
          </Link>
          .
        </p>
      )}
    </section>
  );
}
