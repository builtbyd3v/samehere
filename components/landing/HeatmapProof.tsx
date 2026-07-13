"use client";

import { motion, useReducedMotion } from "motion/react";
import ContributionHeatmap from "@/components/profile/ContributionHeatmap";
import { buildDemoHeatmap, DEMO_PROFILE } from "@/lib/landing/demo-data";

const heatmap = buildDemoHeatmap(DEMO_PROFILE.username);

const HEADLINE = ["Your", "heatmap", "is", "your", "resume."] as const;

export default function HeatmapProof() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-24">
      <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
        <div>
          <h2 className="text-balance text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[42px] md:text-[46px] md:tracking-[-0.04em]">
            {HEADLINE.map((w, i) => (
              <motion.span
                key={w}
                className="mr-[0.22em] inline-block"
                initial={reduce ? undefined : { opacity: 0, y: 16 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
              >
                {i === 1 ? <span className="font-display italic text-[var(--blue)]">{w}</span> : w}
              </motion.span>
            ))}
          </h2>
          <motion.p
            className="mt-5 max-w-[42ch] text-base leading-relaxed text-[var(--ink-muted)]"
            initial={reduce ? undefined : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            Every post, comment, and connection lands here. A year of real activity from a verified
            student, not a highlight reel.
          </motion.p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper sm:p-6">
          <h4 className="mb-4 text-sm font-semibold text-[var(--ink)]">Activity</h4>
          <ContributionHeatmap data={heatmap} animate />
        </div>
      </div>
    </section>
  );
}
