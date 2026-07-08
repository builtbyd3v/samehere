"use client";

import { Stagger, RevealItem } from "./Reveal";

// Benefit tiles — the three reasons to join, scannable in one beat under the hero.
const VALUES = [
  { title: "Verified students only", body: ".edu required. Zero bots, zero impostors." },
  { title: "Effort made visible", body: "A year of real activity on your contribution heatmap." },
  { title: "AI finds your people", body: "Matched on school, major, skills, and goals." },
] as const;

export default function StatsBar() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-14">
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VALUES.map((v, i) => (
          <RevealItem key={v.title} index={i}>
            <div className="card-hover h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-6 py-6 shadow-paper">
              <p className="text-[17px] font-semibold text-[var(--ink)]">{v.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">{v.body}</p>
            </div>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}
