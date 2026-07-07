"use client";

import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const STEPS = [
  {
    title: "Verify with your .edu",
    body: "One real student email gets you in. No fake accounts, no randoms.",
  },
  {
    title: "Post and connect",
    body: "Share what's actually going on. React with Like or SameHere, follow people, or keep it private.",
  },
  {
    title: "Build your heatmap",
    body: "Every post, comment, and connection lands on your heatmap. Keep a streak going and climb your school's leaderboard — a year of real activity, not a highlight reel.",
  },
  {
    title: "Get AI matched",
    body: "We read the overlap in school, major, skills, and goals, then tell you exactly why someone's worth following.",
  },
  {
    title: "DM your people",
    body: "Matched with someone worth talking to? Message them directly. No cold outreach into the void.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className={landingH2}>How it works.</h2>
      </Reveal>

      <Reveal className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]" delay={0.08}>
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-5 py-6 sm:gap-8">
            <span className="shrink-0 text-2xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink-faint)] sm:text-3xl">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--ink)]">{step.title}</h3>
              <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
