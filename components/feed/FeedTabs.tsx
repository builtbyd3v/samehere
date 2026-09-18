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
          aria-selected={tab === "latest"}
          className={
            tab === "latest"
              ? `${pill} text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          {tab === "latest" && (
            <m.span
              layoutId="feed-tab-thumb"
              className="absolute inset-0 rounded-full bg-[var(--blue-glow)]"
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.65, 0, 0.35, 1] }}
              aria-hidden
            />
          )}
          <span className="relative">Latest</span>
        </Link>
        <Link
          href={feedPath({ tab: "following" })}
          role="tab"
          aria-selected={tab === "following"}
          className={
            tab === "following"
              ? `${pill} text-[var(--blue)]`
              : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
          }
        >
          {tab === "following" && (
            <m.span
              layoutId="feed-tab-thumb"
              className="absolute inset-0 rounded-full bg-[var(--blue-glow)]"
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.65, 0, 0.35, 1] }}
              aria-hidden
            />
          )}
          <span className="relative">Following</span>
        </Link>
      </div>
    </LazyMotion>
  );
}
