"use client";

import ContributionHeatmap from "@/components/profile/ContributionHeatmap";
import { buildDemoHeatmap, DEMO_PROFILE } from "@/lib/landing/demo-data";
import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const heatmap = buildDemoHeatmap(DEMO_PROFILE.username);

export default function LandingProfileDemo() {
  return (
    <section id="features" className="scroll-mt-[5.5rem] border-y border-[var(--border)]">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <Reveal>
          <h2 className={`text-balance ${landingH2}`}>Effort you can see.</h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[var(--ink-muted)]">
            Every post, comment, and connection lands on your contribution heatmap. A year of real
            activity on every profile, not a highlight reel.
          </p>
        </Reveal>

        <Reveal className="mt-10" delay={0.08}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper sm:p-6">
            <h4 className="mb-4 text-sm font-semibold text-[var(--ink)]">Activity</h4>
            <ContributionHeatmap data={heatmap} animate />
          </div>
          <p className="mt-4 text-center text-xs text-[var(--ink-muted)]">
            Hover a day to see points. Live on every profile.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
