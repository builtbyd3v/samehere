"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import CanvasGradient from "@/components/landing/CanvasGradient";

// Hero-style highlight — Fraunces italic in the SameHere blue, carried over from
// the landing so the front door feels like the same product.
function Accent({ children }: { children: React.ReactNode }) {
  return <span className="font-display italic text-[var(--blue)]">{children}</span>;
}

const COPY = {
  login: {
    headline: (
      <>
        Welcome <Accent>back</Accent>.
      </>
    ),
    sub: "Jump back into your feed.",
  },
  signup: {
    headline: (
      <>
        You&apos;re not the <Accent>only</Accent> one.
      </>
    ),
    sub: "Verified students only, .edu required. Takes a minute.",
  },
  forgot: {
    headline: (
      <>
        Locked <Accent>out</Accent>?
      </>
    ),
    sub: "We'll send a link to get you back in.",
  },
  updatePassword: {
    headline: (
      <>
        New <Accent>password</Accent>.
      </>
    ),
    sub: "Almost back in.",
  },
};

type Props = {
  variant: keyof typeof COPY;
  children: React.ReactNode;
  footer: React.ReactNode;
  aside?: React.ReactNode; // pinned under the headline on all breakpoints (e.g. founder pill)
  asideExtra?: React.ReactNode; // left column on desktop, below the form on mobile (e.g. bullets)
};

export default function AuthShell({ variant, children, footer, aside, asideExtra }: Props) {
  const reduce = useReducedMotion();
  const { headline, sub } = COPY[variant];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <CanvasGradient height="min(100%, 640px)" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-5 py-8 md:py-12 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-[-0.03em]" aria-label="samehere home">
          <span className="text-[var(--ink)]">same</span>
          <span className="text-[var(--blue)]">here</span>
        </Link>

        <div className="mt-10 flex flex-1 flex-col justify-center gap-10 md:mt-12 md:grid md:grid-cols-2 md:items-center md:gap-16 lg:gap-20">
          <div className="max-w-md">
            <h2 className="text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[40px] lg:text-[44px] lg:tracking-[-0.04em]">
              {headline}
            </h2>
            <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-[var(--ink-muted)] md:text-lg">
              {sub}
            </p>
            {/* founder pill: pinned under the headline on every breakpoint */}
            {aside}
            {/* bullets: left column on desktop only */}
            {asideExtra && <div className="mt-6 hidden md:block">{asideExtra}</div>}
          </div>

          <motion.div
            className="flex flex-col items-start md:items-center md:justify-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
            <div className="mt-5 w-full max-w-md text-sm text-[var(--ink-muted)]">{footer}</div>
            {/* bullets: below the form on mobile so the form fits one screen */}
            {asideExtra && <div className="mt-6 w-full max-w-md md:hidden">{asideExtra}</div>}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
