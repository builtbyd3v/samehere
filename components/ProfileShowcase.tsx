"use client";

import { useState } from "react";

// mock contribution counts — deterministic, presentational only. Blue heatmap kept per product decision.
const CELL = ["bg-[var(--hm0)]", "bg-[var(--hm1)]", "bg-[var(--hm2)]", "bg-[var(--hm3)]"];
function count(i: number, j: number) {
  const n = Math.abs(Math.sin(i * 12.9898 + j * 4.1414) * 43758.5453) % 1;
  return Math.round(n * 11); // 0..11
}
const level = (c: number) => (c === 0 ? 0 : c <= 3 ? 1 : c <= 7 ? 2 : 3);

const PERIODS = [
  { short: "1Y", label: "the last year", weeks: 52 },
  { short: "6M", label: "the last 6 months", weeks: 26 },
  { short: "3M", label: "the last 3 months", weeks: 13 },
];

// ponytail: inline SVG, no icon-lib dep. Bare icons (no circle), in blue.
const IconCrown = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M3 8l4.5 3.2L12 5l4.5 6.2L21 8l-1.6 10.4a1 1 0 0 1-1 .6H5.6a1 1 0 0 1-1-.6L3 8Z" /></svg>);
const IconBolt = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13V2Z" /></svg>);

export default function ProfileShowcase() {
  const [p, setP] = useState(0);
  const { weeks, label } = PERIODS[p];

  let total = 0;
  const cols = Array.from({ length: weeks }, (_, i) =>
    Array.from({ length: 7 }, (_, j) => {
      const c = count(i, j);
      total += c;
      return c;
    })
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <img src="https://picsum.photos/seed/dev-goswami/96/96" alt="" className="h-14 w-14 rounded-full object-cover" />
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold leading-tight">Dev Goswami</p>
            <span title="Founder" className="text-[var(--blue)]"><IconCrown /></span>
            <span title="Pro" className="text-[var(--blue)]"><IconBolt /></span>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">@dev · Founder</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        Building samehere. A place for verified students to show up, share the real stuff, and find
        people who get it.
      </p>

      <div className="mt-5 flex gap-6 text-sm">
        <span><b className="font-semibold">128</b> <span className="text-[var(--ink-muted)]">posts</span></span>
        <span><b className="font-semibold">2,940</b> <span className="text-[var(--ink-muted)]">followers</span></span>
        <span><b className="font-semibold">311</b> <span className="text-[var(--ink-muted)]">following</span></span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <p className="text-sm text-[var(--ink-muted)]"><b className="text-[var(--ink)]">{total.toLocaleString()}</b> contributions in {label}</p>
        <div className="flex gap-0.5 rounded-full border border-[var(--border)] p-0.5">
          {PERIODS.map((x, i) => (
            <button key={x.short} onClick={() => setP(i)} className={`rounded-full px-2.5 py-1 text-xs transition ${i === p ? "bg-[var(--hm0)] text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{x.short}</button>
          ))}
        </div>
      </div>

      {/* heatmap — fluid, fits the card, no scrollbar */}
      <div className="mt-4 flex gap-[2px]">
        {cols.map((col, i) => (
          <div key={i} className="flex min-w-0 max-w-[13px] flex-1 flex-col gap-[2px]">
            {col.map((c, j) => (
              <div key={j} title={`${c} contributions`} className={`aspect-square w-full rounded-[2px] ${CELL[level(c)]}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
        <span>Less</span>
        {CELL.map((c, i) => <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}
