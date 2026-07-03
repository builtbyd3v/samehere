"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import HeroVisual from "./HeroVisual";
import { ghostCta, signupCta } from "./cta";

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative">
      <div className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-[1200px] flex-col justify-center gap-14 px-5 py-10 md:py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
        <div className="lg:max-w-[52%]">
          <motion.h1
            className="text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[56px] md:text-[64px] lg:text-[72px] lg:tracking-[-0.04em]"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            You&apos;re not the only one.
          </motion.h1>
          <motion.p
            className="mt-6 max-w-[40ch] text-lg leading-[1.45] text-[var(--ink-muted)] md:text-xl"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            The social network for verified students. Post the real stuff. React with SameHere when it&apos;s you too.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/signup" className={signupCta}>
              Join with your .edu
            </Link>
            <Link href="/login" className={ghostCta}>
              Log in
            </Link>
          </motion.div>
          <motion.p
            className="mt-4 text-sm text-[var(--ink-faint)]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.24 }}
          >
            Free · Verified .edu only · Private when you want
          </motion.p>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}
