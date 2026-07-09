"use client";

import Reveal, { Stagger, RevealItem } from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const STEPS = [
  {
    title: "Join free",
    body: "Sign up with any email in a few seconds. Verify a .edu, now or later in settings, and get the verified student badge.",
  },
  {
    title: "Post, react, and build your heatmap",
    body: "Share what's going on and react with SameHere. Every post, comment, and connection lands on your contribution heatmap, plus streaks and your school's leaderboard. A year of real effort, not a highlight reel.",
  },
  {
    title: "Get AI-matched and DM your people",
    body: "We read the overlap in school, major, skills, and goals, tell you exactly why someone's worth following, then you message them directly. No cold outreach into the void.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-[5.5rem] mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className={landingH2}>How it works.</h2>
      </Reveal>

      <Stagger className="mt-8 space-y-1">
        {STEPS.map((step, i) => (
          <RevealItem key={step.title} index={i}>
            <div className="group flex gap-5 rounded-2xl px-3 py-6 transition-colors hover:bg-[var(--featured-surface)] sm:gap-8 sm:px-5">
              <span className="shrink-0 text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--blue)] sm:text-4xl">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-medium text-[var(--ink)]">{step.title}</h3>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
                  {step.body}
                </p>
              </div>
            </div>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}
