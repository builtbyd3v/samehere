"use client";

import Reveal from "./Reveal";

const CLAIMS = [".edu only", "0 fake followers", "52 weeks tracked"] as const;

export default function StatsBar() {
  return (
    <section className="border-y border-[var(--border)]">
      <Reveal className="mx-auto max-w-[1200px] px-5 py-6">
        <p className="text-center text-sm leading-relaxed text-[var(--ink-muted)]">
          {CLAIMS.map((c, i) => (
            <span key={c}>
              {i > 0 && <span className="mx-3 text-[var(--ink-faint)]">·</span>}
              {c}
            </span>
          ))}
        </p>
      </Reveal>
    </section>
  );
}
