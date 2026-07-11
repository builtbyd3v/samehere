"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "samehere-onboarding-dismissed";

type Props = {
  avatarUrl: string | null;
  bio: string | null;
  postCount: number;
  followingCount: number;
  verifiedStudent: boolean;
  inClub: boolean;
};

// ponytail: composer toggle lives as local state inside FeedToolbar (owned
// elsewhere); click through the DOM instead of lifting that state up.
function openComposer() {
  const btn = document.querySelector<HTMLButtonElement>('button[aria-label="New post"]');
  btn?.click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function OnboardingChecklist({
  avatarUrl,
  bio,
  postCount,
  followingCount,
  verifiedStudent,
  inClub,
}: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const steps = [
    { done: !!avatarUrl, label: "Upload an avatar", href: "/profile/edit" },
    { done: !!(bio && bio.trim().length > 10), label: "Write a short bio", href: "/profile/edit" },
    { done: postCount > 0, label: "Publish your first post", href: "/feed" },
    { done: followingCount > 0, label: "Follow someone", href: "/feed?search=1" },
    { done: verifiedStudent, label: "Verify your school email", href: "/settings" },
    { done: inClub, label: "Join a club", href: "/community" },
    // ponytail: no client-side completion signal for "shared their link" — pointer, not a tracked task.
    { done: false, label: "Share your invite link", href: "/referrals" },
  ];

  const needsPost = postCount === 0;
  const needsFollow = followingCount === 0;

  if (dismissed || (!needsPost && !needsFollow)) return null;

  return (
    <section className="card mb-3 animate-[modal-in_220ms_ease] p-4 motion-reduce:animate-none sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">Get your feed going</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {needsPost && needsFollow
              ? "Post something and follow a few students to see your feed fill up."
              : needsPost
                ? "Post something to see it land on your heatmap."
                : "Follow a few students to see their posts here."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-xs text-[var(--ink-muted)] underline transition active:scale-[0.97]"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {needsPost && (
          <button type="button" onClick={openComposer} className="btn-primary">
            Make your first post
          </button>
        )}
        {needsFollow && (
          <Link href="/feed?search=1" className="btn-ghost">
            Follow a few people
          </Link>
        )}
      </div>
      {needsPost && <p className="mt-2 text-xs text-[var(--ink-muted)]">A post of 150+ characters earns 4 heatmap points.</p>}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--border)] pt-3">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`flex items-center gap-1.5 text-xs transition active:scale-[0.97] ${s.done ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)] hover:underline"}`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] ${
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
