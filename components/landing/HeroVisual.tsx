"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import LandingPostCard from "./LandingPostCard";
import { DEMO_POSTS } from "@/lib/landing/demo-data";

function subscribeTabVisible(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

function getTabVisible() {
  return !document.hidden;
}

// Hydration-safe "is JS alive" flag. Server snapshot is false, client snapshot
// is true, so the SSR HTML renders the static first slide and the crossfade only
// takes over after hydration. useSyncExternalStore rather than setState-in-effect
// (which triggers a cascading render, and the lint rule that forbids it).
const noopSubscribe = () => () => {};

export default function HeroVisual() {
  const reduce = useReducedMotion();
  const tabVisible = useSyncExternalStore(subscribeTabVisible, getTabVisible, () => true);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  // Gates the AnimatePresence slide transition. Before JS runs (or if it never
  // does), the first post renders as a plain, fully-visible element — the
  // motion-driven crossfade only takes over once we know JS is alive.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const post = DEMO_POSTS[index];

  // Auto-advance so the card isn't dead until touched. Pauses on hover, for
  // reduced-motion, and while the tab is hidden.
  useEffect(() => {
    if (reduce || paused || !tabVisible) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % DEMO_POSTS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [reduce, paused, tabVisible]);

  function go(dir: -1 | 1) {
    setDirection(dir);
    setIndex((i) => (i + dir + DEMO_POSTS.length) % DEMO_POSTS.length);
  }

  function pick(i: number) {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  }

  return (
    <div
      className="fade-rise w-full lg:max-w-[48%] lg:flex-1"
      style={{ ["--y" as string]: "24px", ["--delay" as string]: "0.12s" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-post)] p-3 sm:p-4">
        {mounted ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={post.id}
              initial={reduce ? false : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <LandingPostCard post={post} interactive highlightSamehere />
            </motion.div>
          </AnimatePresence>
        ) : (
          <LandingPostCard post={post} interactive highlightSamehere />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {DEMO_POSTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(i)}
              aria-label={`Show post from ${p.name}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-[var(--ink)]" : "w-2 bg-[var(--border-strong)] hover:bg-[var(--ink-muted)]"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            Next
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-[var(--ink-muted)]">
        Tap SameHere. Same reactions as the real feed.
      </p>
    </div>
  );
}
