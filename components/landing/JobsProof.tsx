"use client";

import { motion, useReducedMotion } from "motion/react";
import DemoAvatar from "./DemoAvatar";
import AiTag from "./AiTag";

const JOBS = [
  {
    org: "Stripe",
    title: "Software Engineering Intern",
    fit: "Strong fit: your robotics project shows up in the match.",
    workedHere: [
      { name: "Marcus Webb", seed: "marcus-samehere" },
      { name: "Jordan Kim", seed: "jordan-samehere" },
    ],
  },
  {
    org: "Figma",
    title: "Product Design Intern",
    fit: "Strong fit: your portfolio overlaps with what they hired for.",
    workedHere: [{ name: "Nina Alvarez", seed: "nina-samehere" }],
  },
  {
    org: "NASA JPL",
    title: "Robotics Research Intern",
    fit: "Good fit: coursework match, light on project history.",
    workedHere: [
      { name: "Priya Raman", seed: "priya-samehere" },
      { name: "Tyler Brooks", seed: "tyler-samehere" },
      { name: "Sofia Delgado", seed: "sofia-samehere" },
    ],
  },
] as const;

export default function JobsProof() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto max-w-[900px] px-5 py-24 sm:py-28">
      <motion.h2
        className="text-balance text-center text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[42px] md:text-[46px] md:tracking-[-0.04em]"
        initial={reduce ? undefined : { opacity: 0, y: 16 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        Find the internship. Then <span className="font-display italic text-[var(--blue)]">DM</span> someone who had it.
      </motion.h2>

      <div className="mt-12 flex flex-col gap-4">
        {JOBS.map((j, i) => (
          <motion.div
            key={j.org}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper sm:p-6"
            initial={reduce ? undefined : { opacity: 0, y: 24 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-[var(--ink)]">{j.org}</p>
                <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{j.title}</p>
              </div>
              <div className="flex -space-x-2.5">
                {j.workedHere.map((p) => (
                  <DemoAvatar key={p.seed} seed={p.seed} name={p.name} className="h-8 w-8 border-2 border-[var(--surface-raised)] text-[11px]" />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <AiTag>Fit</AiTag>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">{j.fit}</p>
            </div>

            <p className="mt-4 text-xs text-[var(--ink-faint)]">
              {j.workedHere.length} student{j.workedHere.length > 1 ? "s" : ""} interned here. DM them for the real story.
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
