"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "samehere-onboarding-dismissed";

type Props = {
  avatarUrl: string | null;
  bio: string | null;
  postCount: number;
  followingCount: number;
};

export default function OnboardingChecklist({ avatarUrl, bio, postCount, followingCount }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const steps = [
    { done: !!avatarUrl, label: "Upload an avatar", href: "/profile/edit" },
    { done: !!(bio && bio.trim().length > 10), label: "Write a short bio", href: "/profile/edit" },
    { done: postCount > 0, label: "Publish your first post", href: "/feed" },
    { done: followingCount > 0, label: "Follow someone", href: "/feed?search=1" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (dismissed || doneCount === steps.length) return null;

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Get started</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {doneCount} of {steps.length} complete
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="text-xs text-[var(--ink-muted)] underline"
        >
          Dismiss
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`flex items-center gap-2 text-sm ${s.done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)] hover:underline"}`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                  s.done ? "border-[var(--blue)] bg-[var(--blue)] text-white" : "border-[var(--border)]"
                }`}
                aria-hidden
              >
                {s.done ? "✓" : ""}
              </span>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
