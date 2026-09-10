"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Source: https://www.beautifului.dev/ — TaskRows capsules/details adapted to
// repository-analysis stages. Parent drives one-shot progress. No internal
// ticker and no fake elapsed times.

const ROWS = [
  {
    key: "read",
    label: "Read the repository",
    amount: "4 files",
    details: [
      { label: "Public tree only", meta: "example" },
      { label: "README and source files", meta: "selected" },
    ],
  },
  {
    key: "understand",
    label: "Understand the project",
    amount: "1 draft",
    details: [
      { label: "Name what it does", meta: "draft" },
      { label: "Keep your words editable", meta: "yours" },
    ],
  },
  {
    key: "save",
    label: "Save an editable draft",
    amount: "private",
    details: [
      { label: "Stays on your profile as a draft", meta: "private" },
      { label: "You choose when to share", meta: "you" },
    ],
  },
] as const;

function SpinnerRing({ active, children }: { active?: boolean; children: React.ReactNode }) {
  const size = 24;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className="landing-analysis-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="landing-analysis-ring-svg" data-active={active || undefined}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {active ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.28} ${circumference * 0.72}`}
          />
        ) : null}
      </svg>
      <span className="landing-analysis-ring-label">{children}</span>
    </span>
  );
}

export default function AnalysisRows({
  activeIndex,
  completedCount,
  reduceMotion,
  paused = false,
}: {
  activeIndex: number;
  completedCount: number;
  reduceMotion: boolean;
  paused?: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="landing-analysis-rows">
      {ROWS.map((row, index) => {
        const done = index < completedCount;
        const active = index === activeIndex;
        const open = manualOpen[row.key] ?? active;

        return (
          <div
            key={row.key}
            className="landing-analysis-row"
            data-open={open || undefined}
            data-active={active || undefined}
            data-done={done || undefined}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() =>
                setManualOpen((current) => ({
                  ...current,
                  [row.key]: !open,
                }))
              }
              className="landing-analysis-row-head"
            >
              <span className="landing-analysis-row-badge">
                {done ? (
                  <span className="landing-analysis-check" data-motion={!reduceMotion || undefined}>
                    <Check size={13} strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  <SpinnerRing active={active && !reduceMotion && !paused}>{index + 1}</SpinnerRing>
                )}
              </span>
              <span className="landing-analysis-row-text">
                <span className="landing-analysis-row-label">{row.label}</span>
                <span className="landing-analysis-row-meta">
                  <span className="landing-analysis-row-amount">{row.amount}</span>
                  {done ? <span className="landing-analysis-pill">Done</span> : null}
                  {active && !done ? <span className="landing-analysis-pill is-live">Now</span> : null}
                </span>
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className="landing-analysis-chevron"
              />
            </button>
            <div className="landing-analysis-row-body" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
              <div>
                <div className="landing-analysis-details">
                  <span aria-hidden className="landing-analysis-rail" />
                  <div>
                    {row.details.map((detail) => (
                      <div key={detail.label} className="landing-analysis-detail">
                        <span>{detail.label}</span>
                        <span>{detail.meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
