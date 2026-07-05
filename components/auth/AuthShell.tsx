"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import CanvasGradient from "@/components/landing/CanvasGradient";

const COPY = {
  login: {
    headline: "Welcome back.",
    sub: "Jump back into your feed.",
  },
  signup: {
    headline: "You're not the only one.",
    sub: "Verified students only, .edu required. Takes a minute.",
  },
  forgot: {
    headline: "Locked out?",
    sub: "We'll send a link to get you back in.",
  },
  updatePassword: {
    headline: "New password.",
    sub: "Almost back in.",
  },
} as const;

type Props = {
  variant: keyof typeof COPY;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export default function AuthShell({ variant, children, footer }: Props) {
  const reduce = useReducedMotion();
  const { headline, sub } = COPY[variant];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <CanvasGradient height="min(100%, 640px)" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-5 py-8 md:py-12 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-[-0.02em]">
          samehere
        </Link>

        <div className="mt-10 flex flex-1 flex-col justify-center gap-10 md:mt-12 md:grid md:grid-cols-2 md:items-center md:gap-16 lg:gap-20">
          <div className="max-w-md">
            <h2 className="text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[40px] lg:text-[44px] lg:tracking-[-0.04em]">
              {headline}
            </h2>
            <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-[var(--ink-muted)] md:text-lg">
              {sub}
            </p>
          </div>

          <motion.div
            className="flex flex-col items-start md:items-center md:justify-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
            <div className="mt-5 w-full max-w-md text-sm text-[var(--ink-muted)]">{footer}</div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
