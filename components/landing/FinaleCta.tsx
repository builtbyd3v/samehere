"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { signupCta } from "./cta";

export default function FinaleCta() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] py-28 sm:py-36">
      <div aria-hidden className="finale-ambient pointer-events-none absolute" />

      <motion.div
        className="relative z-10 mx-auto max-w-[900px] px-5 text-center"
        initial={reduce ? undefined : { opacity: 0, y: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-balance text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[64px] md:text-[76px] md:tracking-[-0.045em]">
          You&apos;re not the only one.
          <br />
          <span className="text-stroke">same here.</span>
        </h2>

        <span className="relative mt-10 inline-block">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
            style={{ background: "var(--blue-glow)" }}
          />
          <Link href="/signup" className={`btn-premium relative overflow-hidden ${signupCta}`}>
            <span className="relative z-10">Join free</span>
            {!reduce && <span aria-hidden className="btn-premium-sweep" />}
          </Link>
        </span>
      </motion.div>
    </section>
  );
}
