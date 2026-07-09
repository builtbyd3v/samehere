"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import HeroCluster from "./HeroCluster";
import { ghostCta, signupCta } from "./cta";

const EASE = [0.16, 1, 0.3, 1] as const;
// "only" carries the highlight — Fraunces italic in the SameHere blue.
const HEADLINE = [
  { w: "You're", accent: false },
  { w: "not", accent: false },
  { w: "the", accent: false },
  { w: "only", accent: true },
  { w: "one.", accent: false },
] as const;

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative">
      <div className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-[1200px] flex-col justify-center gap-6 px-5 py-10 md:gap-8 md:py-14">
        <HeroCluster />

        <div className="relative z-10 mx-auto max-w-[46rem] text-center">
          <motion.p
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1 text-[13px] font-medium text-[var(--ink-muted)]"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
            Verified students only · .edu required
          </motion.p>

          <h1 className="text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[56px] md:text-[68px] md:tracking-[-0.04em]">
            {HEADLINE.map((item, i) => (
              <span
                key={i}
                className={`word-rise mr-[0.22em] inline-block will-change-transform ${
                  item.accent ? "font-display italic text-[var(--blue)]" : ""
                }`}
                style={{ ["--delay" as string]: `${0.05 + i * 0.07}s` }}
              >
                {item.w}
              </span>
            ))}
          </h1>

          <motion.p
            className="mx-auto mt-6 max-w-[42ch] text-lg leading-[1.45] text-[var(--ink-muted)] md:text-xl"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
          >
            Post what's real. Grow a heatmap. Let AI find your people.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.62, ease: EASE }}
          >
            <span className="relative">
              {/* blue glow bloom behind the primary CTA — SameHere signature as
                  atmosphere (button text stays high-contrast charcoal) */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
                style={{ background: "var(--blue-glow)" }}
              />
              <Link href="/signup" className={`group relative overflow-hidden ${signupCta}`}>
                <span className="relative z-10">Join with .edu</span>
                {!reduce && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  />
                )}
              </Link>
            </span>
            <Link href="/login" className={ghostCta}>
              Log in
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
