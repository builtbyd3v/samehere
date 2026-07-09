"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import HeroCluster from "./HeroCluster";
import { ghostCta, signupCta } from "./cta";

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
          <p
            className="fade-rise mb-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1 text-[13px] font-medium text-[var(--ink-muted)]"
            style={{ ["--y" as string]: "12px" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
            Built for students · free to join
          </p>

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

          <p
            className="fade-rise mx-auto mt-6 max-w-[42ch] text-lg leading-[1.45] text-[var(--ink-muted)] md:text-xl"
            style={{ ["--y" as string]: "20px", ["--delay" as string]: "0.5s" }}
          >
            Post what&apos;s real. Grow a heatmap. Let AI find your people.
          </p>

          <div
            className="fade-rise mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ ["--y" as string]: "20px", ["--delay" as string]: "0.62s" }}
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
                <span className="relative z-10">Join free</span>
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
          </div>
        </div>
      </div>
    </section>
  );
}
