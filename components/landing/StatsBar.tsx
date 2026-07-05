"use client";

import Reveal from "./Reveal";

const STATS = [
  { value: ".edu only", label: "Every account verified with a real student email. No randoms, no bots." },
  { value: "0 fake followers", label: "No follower farming, no engagement bait. Just people you actually know or want to." },
  { value: "52 weeks", label: "Tracked automatically. Post, comment, or connect and it shows up on your heatmap." },
] as const;

export default function StatsBar() {
  return (
    <section className="border-y border-[var(--border)]">
      <Reveal className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 sm:grid-cols-3 sm:gap-6 sm:py-16">
        {STATS.map((s) => (
          <div key={s.value}>
            <p className="text-[36px] font-semibold leading-none tracking-[-0.02em] sm:text-[40px]">{s.value}</p>
            <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-[var(--ink-muted)]">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
