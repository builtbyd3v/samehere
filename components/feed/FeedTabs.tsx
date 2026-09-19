"use client";

import Link from "next/link";
import { LazyMotion, domMax, m } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { feedPath } from "@/lib/feed-label";

const pill =
  "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.97]";

export default function FeedTabs({
  tab,
}: {
  tab: "latest" | "following";
}) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <LazyMotion features={domMax} strict>
      <div
        className="relative inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
        role="tablist"
        aria-label="Feed"
      >
        <Link
          href={feedPath()}
          role="tab"
          id="feed-tab-latest"
          aria-selected={tab === "latest"}
          aria-controls="feed-panel"
          className={
            tab === "latest"
              ? `${pill} text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          {tab === "latest" && (
            <m.span
              layoutId="feed-tab-thumb"
              className="absolute inset-0 rounded-full bg-[var(--featured-surface)] shadow-[inset_0_0_0_1px_var(--border)]"
              transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
          )}
          <span className="relative">Latest</span>
        </Link>
        <Link
          href={feedPath({ tab: "following" })}
          role="tab"
          id="feed-tab-following"
          aria-selected={tab === "following"}
          aria-controls="feed-panel"
          className={
            tab === "following"
              ? `${pill} text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          {tab === "following" && (
            <m.span
              layoutId="feed-tab-thumb"
              className="absolute inset-0 rounded-full bg-[var(--featured-surface)] shadow-[inset_0_0_0_1px_var(--border)]"
              transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
          )}
          <span className="relative">Following</span>
        </Link>
      </div>
    </LazyMotion>
  );
}
