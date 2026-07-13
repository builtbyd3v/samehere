"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import DemoAvatar from "./DemoAvatar";
import AiTag from "./AiTag";

type Match = { name: string; school: string; avatarSeed: string; why: string };

// Decorative — the search demo IS the pitch, not a real input. Identities reuse
// the hero-peer avatar seeds so the illustrated people stay consistent site-wide.
const QUERIES: { text: string; matches: Match[] }[] = [
  {
    text: "a sophomore CS major building a startup",
    matches: [
      { name: "Marcus Webb", school: "Georgia Tech", avatarSeed: "marcus-samehere", why: "Also CS. Building a campus app right now." },
      { name: "Jordan Kim", school: "UCLA", avatarSeed: "jordan-samehere", why: "Shipped a side project at 2am. Sophomore too." },
      { name: "Priya Raman", school: "UT Austin", avatarSeed: "priya-samehere", why: "CS sophomore, always down to talk startups." },
    ],
  },
  {
    text: "transfer student who feels behind in CS",
    matches: [
      { name: "Sofia Delgado", school: "Miami Dade (transfer)", avatarSeed: "sofia-samehere", why: "Transferred in, still finding her footing in CS." },
      { name: "Omar Haddad", school: "De Anza (transfer)", avatarSeed: "omar-samehere", why: "Transfer student. Behind on paper, not on effort." },
      { name: "Devon Clarke", school: "First-gen · Rutgers", avatarSeed: "devon-samehere", why: "First-gen, catching CS up one class at a time." },
    ],
  },
];

const TYPE_MS = 42;
const HOLD_MS = 4200;
const GAP_MS = 500;

const SCATTER = [
  { rotate: -2.2, y: 6 },
  { rotate: 1.4, y: -4 },
  { rotate: -0.8, y: 10 },
] as const;

function MatchCard({ m, i }: { m: Match; i: number }) {
  const s = SCATTER[i % SCATTER.length];
  return (
    <motion.div
      className="match-card w-full max-w-[280px] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 shadow-paper sm:w-[220px]"
      style={{ rotate: s.rotate }}
      initial={{ opacity: 0, y: 28 + s.y, scale: 0.88, rotate: 0 }}
      animate={{ opacity: 1, y: s.y, scale: 1, rotate: s.rotate }}
      exit={{ opacity: 0, y: 12, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.08 * i }}
    >
      <div className="flex items-center gap-2.5">
        <DemoAvatar seed={m.avatarSeed} name={m.name} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-[var(--ink)]">{m.name}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--ink-muted)]">{m.school}</p>
        </div>
      </div>
      <div className="mt-2.5">
        <AiTag>Why this match</AiTag>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.4] text-[var(--ink-muted)]">{m.why}</p>
      </div>
    </motion.div>
  );
}

export default function HeroSearchDemo() {
  const reduce = useReducedMotion();
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState(reduce ? QUERIES[0].text : "");
  const [showMatches, setShowMatches] = useState(!!reduce);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const query = QUERIES[qi];

  useEffect(() => {
    if (reduce) return; // static completed state, no loop

    timers.current.forEach(clearTimeout);
    timers.current = [];

    const text = QUERIES[qi].text;
    let i = 0;
    function tick() {
      i += 1;
      setTyped(text.slice(0, i));
      if (i < text.length) {
        timers.current.push(setTimeout(tick, TYPE_MS));
      } else {
        timers.current.push(
          setTimeout(() => setShowMatches(true), 300),
        );
        timers.current.push(
          setTimeout(() => setQi((v) => (v + 1) % QUERIES.length), TYPE_MS * text.length + 300 + HOLD_MS + GAP_MS),
        );
      }
    }
    // reset happens inside a timer (not the effect body) so the effect only
    // schedules work — keeps react-hooks/set-state-in-effect happy and the
    // previous query's matches visible until the new cycle actually starts.
    timers.current.push(
      setTimeout(() => {
        setShowMatches(false);
        setTyped("");
        timers.current.push(setTimeout(tick, 400));
      }, 0),
    );

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, reduce]);

  const matches = useMemo(() => query.matches, [query]);

  return (
    <div aria-hidden className="mx-auto w-full max-w-[640px]">
      <div className="search-glass flex items-center rounded-full px-6 py-4 sm:px-7 sm:py-5">
        <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="none" className="mr-3 shrink-0 text-[var(--ink-faint)]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p aria-hidden className="min-w-0 flex-1 truncate text-left text-[15px] text-[var(--ink)] sm:text-lg">
          {typed}
          <span className="type-caret h-[1.1em] translate-y-[0.15em]" />
        </p>
      </div>

      <div className="mt-8 flex min-h-[190px] flex-col items-center justify-start gap-3 sm:min-h-[210px] sm:flex-row sm:items-start sm:justify-center sm:gap-5">
        <AnimatePresence mode="wait">
          {showMatches && (
            <motion.div
              key={qi}
              className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-5"
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              {matches.map((m, i) => (
                <MatchCard key={m.name} m={m} i={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
