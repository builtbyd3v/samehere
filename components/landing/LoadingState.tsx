"use client";

import { useEffect, useState } from "react";

// Source: https://www.beautifului.dev/ — adapted to SameHere color tokens.
const chevron = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, index) => {
  const orderIndex = ORBIT_ORDER.indexOf(index);
  return orderIndex === -1 ? null : orderIndex * 110;
});

const PATTERNS: Record<
  string,
  { delays: (number | null)[]; dur: number; round: boolean }
> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function useElapsed() {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setDeciseconds((current) => current + 1),
      100,
    );
    return () => window.clearInterval(timer);
  }, []);

  const total = deciseconds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({
  label = "Churning",
  variant = "Drive",
}: {
  label?: string;
  variant?: string;
}) {
  const elapsed = useElapsed();
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    <div className="landing-loading-state flex w-fit items-center gap-2.5">
      <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((delay, index) => (
          <span
            key={index}
            className={`landing-loading-pixel size-[4px] bg-[var(--accent-blue)] ${
              round ? "rounded-full" : "rounded-[1px]"
            }`}
            style={{
              opacity: delay === null ? 0.07 : 0.15,
              animation:
                delay === null
                  ? "none"
                  : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
            }}
          />
        ))}
      </span>
      <span
        className="landing-loading-label bg-clip-text text-[13px] font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--ink-faint) 35%, var(--ink) 50%, var(--ink-faint) 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      <span className="font-mono text-[12px] text-[var(--ink-faint)] tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}
