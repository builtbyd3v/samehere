"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";
import { signupCta } from "./cta";

export default function CtaBand() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-[var(--border)]">
      <Reveal className="mx-auto max-w-[1200px] px-5 py-24 text-center">
        <h2 className={landingH2}>
          Find your people.
        </h2>
        <p className="mx-auto mt-4 max-w-[40ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Built for students, and it&apos;s free forever.
        </p>
        <motion.div
          className="relative mt-8 inline-block"
          whileTap={reduce ? undefined : { scale: 0.98 }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
            style={{ background: "var(--blue-glow)" }}
          />
          <Link href="/signup" className={signupCta}>
            Join free
          </Link>
        </motion.div>
      </Reveal>
    </section>
  );
}
