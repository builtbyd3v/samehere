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
          Your campus is already here.
        </h2>
        <p className="mx-auto mt-4 max-w-[40ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Come find your people. Verified students only.
        </p>
        <motion.div
          className="mt-8"
          whileTap={reduce ? undefined : { scale: 0.98 }}
        >
          <Link href="/signup" className={signupCta}>
            Join with your .edu
          </Link>
        </motion.div>
      </Reveal>
    </section>
  );
}
