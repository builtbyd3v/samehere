"use client";

import { useEffect, useState } from "react";

// Source: https://www.beautifului.dev/ — adapted to SameHere path tasks and tokens.
const TICKS = [600, 900, 2400, 1400, 2400, 600];

function useTick(intervals: number[]) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick >= intervals.length - 1) return;
    const timer = window.setTimeout(
      () => setTick((current) => current + 1),
      intervals[tick],
    );
    return () => window.clearTimeout(timer);
  }, [tick, intervals]);

  return tick;
}

function SpinnerRing({
  active,
  children,
}: {
  active?: boolean;
  children?: React.ReactNode;
}) {
  const size = 24;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: "spin 1.1s linear infinite" } : undefined}
      >
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
      <span className="relative text-[10.5px] font-semibold tabular-nums text-[var(--ink)]">
        {children}
      </span>
    </span>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "danger" | "complete";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-white ${
        tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--accent-blue)]"
      }`}
      style={{
        animation: "pop-in 300ms cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      {children}
    </span>
  );
}

const XIcon = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const CheckIcon = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m20 6-11 11-5-5" />
  </svg>
);

const RetryIcon = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
  </svg>
);

export default function TaskRows({
  variant = "Capsules",
}: {
  variant?: string;
}) {
  const tick = useTick(TICKS);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const planState: "pending" | "failed" | "done" =
    tick < 3 ? "pending" : tick === 3 ? "failed" : "done";

  const rows = [
    {
      key: "scope",
      badge: <Badge tone="complete">{CheckIcon}</Badge>,
      label: "Scope one project",
      amount: "1 brief",
      pill: (
        <span className="inline-flex h-5.5 items-center rounded-full bg-[var(--accent-blue-soft)] px-2 text-[11.5px] font-medium text-[var(--accent-blue-strong)]">
          Completed
        </span>
      ),
      details: [
        { label: "Target role selected", meta: "SWE" },
        { label: "Proof gap identified", meta: "teamwork" },
      ],
    },
    {
      key: "build",
      badge: <SpinnerRing active>2</SpinnerRing>,
      label: "Build the smallest version",
      amount: "3 tasks",
      pill: null,
      details: [
        { label: "Implement core interaction", meta: "doing" },
        { label: "Deploy working preview", meta: "next" },
      ],
    },
    {
      key: "story",
      badge:
        planState === "pending" ? (
          <SpinnerRing>3</SpinnerRing>
        ) : planState === "failed" ? (
          <Badge tone="danger">{XIcon}</Badge>
        ) : (
          <Badge tone="complete">{CheckIcon}</Badge>
        ),
      label: "Write the project story",
      amount: "2 bullets",
      pill:
        planState === "failed" ? (
          <span
            className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--danger)_14%,transparent)] px-2 text-[11.5px] font-medium text-[var(--danger)]"
            style={{ animation: "fade-in 200ms ease-out both" }}
          >
            Retry
            <span
              style={{ animation: "spin 1.2s linear infinite" }}
              className="flex"
            >
              {RetryIcon}
            </span>
          </span>
        ) : planState === "done" ? (
          <span
            className="inline-flex h-5.5 items-center rounded-full bg-[var(--accent-blue-soft)] px-2 text-[11.5px] font-medium text-[var(--accent-blue-strong)]"
            style={{ animation: "fade-in 200ms ease-out both" }}
          >
            Completed
          </span>
        ) : null,
      details: [
        { label: "Name the failed assumption", meta: "draft" },
        { label: "Explain the decision", meta: "draft" },
      ],
    },
  ];

  const list = variant === "List";

  return (
    <div
      className={`flex w-full max-w-110 flex-col ${
        list
          ? "gap-0 self-start overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]"
          : "min-h-[196px] gap-2"
      }`}
    >
      {rows.map((row, index) => {
        const open = manualOpen[row.key] ?? (row.key === "build" && tick === 2);

        return (
          <div
            key={row.key}
            className={`self-stretch overflow-hidden transition-[border-radius] duration-300 ${
              list
                ? "border-b border-[var(--border)] last:border-0"
                : "border border-[var(--border)] bg-[var(--surface)]"
            }`}
            style={{
              borderRadius: list ? 0 : open ? 14 : 22,
              animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${
                index * 80
              }ms both`,
            }}
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
              className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left transition-colors duration-100 hover:bg-[var(--featured-surface)]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {row.badge}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)]">
                {row.label}
              </span>
              <span className="text-[12.5px] tabular-nums text-[var(--ink-muted)]">
                {row.amount}
              </span>
              {row.pill}
              <span
                aria-hidden
                className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--ink-faint)]"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300"
                  style={{
                    transform: open ? "rotate(180deg)" : "rotate(0)",
                  }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows,opacity] duration-300"
              style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                  <span
                    aria-hidden
                    className="mx-auto h-full w-px bg-[var(--border)]"
                  />
                  <div className="flex flex-col gap-1.5">
                    {row.details.map((detail, detailIndex) => (
                      <div
                        key={detail.label}
                        className="flex items-center justify-between"
                        style={
                          open
                            ? {
                                animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${
                                  120 + detailIndex * 100
                                }ms both`,
                              }
                            : undefined
                        }
                      >
                        <span className="text-[12px] text-[var(--ink-muted)]">
                          {detail.label}
                        </span>
                        <span className="font-mono text-[11.5px] tabular-nums text-[var(--ink-faint)]">
                          {detail.meta}
                        </span>
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
