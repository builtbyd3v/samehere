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

export default function HeroVisual() {
  const reduce = useReducedMotion();
  const tabVisible = useSyncExternalStore(subscribeTabVisible, getTabVisible, () => true);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
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
    <motion.div
      className="w-full lg:max-w-[48%] lg:flex-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-post)] p-3 sm:p-4">
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
    </motion.div>
  );
}
