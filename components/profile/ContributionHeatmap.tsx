"use client";

// Client component — hover needs state for the styled tooltip (native `title`
// can't be styled). Grid-building stays a pure function so it's easy to test.
// Fixed-size cells keep month/weekday labels column-aligned; the grid scrolls
// horizontally on narrow viewports (auto-scrolls to the most recent week).

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type HeatmapDay = { day: string; points: number; breakdown: Record<string, number> };
type Cell = { date: string; points: number; breakdown: Record<string, number>; future: boolean };

// Blue heatmap ramp — same tokens as landing demo.
const CELL = ["bg-[var(--hm0)]", "bg-[var(--hm1)]", "bg-[var(--hm2)]", "bg-[var(--hm3)]"];
const level = (p: number) => (p === 0 ? 0 : p <= 3 ? 1 : p <= 7 ? 2 : 3);

const ACTION_LABEL: Record<string, string> = {
  post: "Post",
  comment: "Comment",
  connection: "Connection",
  profile_update: "Profile update",
};

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

const fmtDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Shared sizing — every slot (month label, weekday label, cell) uses these so
// columns stay aligned. 10px on mobile, 14px from sm up.
const SLOT = "h-2.5 w-2.5 sm:h-3.5 sm:w-3.5";
const GAP = "gap-0.5 sm:gap-[3px]";
const MONTH_H = "h-2.5 sm:h-3.5";
const LABEL = "text-[9px] sm:text-[11px] leading-none text-[var(--ink-faint)]";

// Sun-aligned 53-column grid (52 weeks back + the current week), one row per
// weekday. Days after today in the current week are `future` (rendered blank so
// column alignment holds). UTC throughout.
// ponytail: dates in UTC; day-boundary drift near local midnight not handled.
export function buildHeatmapGrid(data: HeatmapDay[], today: Date = new Date()): Cell[][] {
  const byDate = new Map(data.map((d) => [d.day, d]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const firstSunday = new Date(end);
  firstSunday.setUTCDate(end.getUTCDate() - end.getUTCDay() - 52 * 7);

  const cols: Cell[][] = [];
  for (let w = 0; w < 53; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(firstSunday);
      cur.setUTCDate(firstSunday.getUTCDate() + w * 7 + d);
      const date = cur.toISOString().slice(0, 10);
      const entry = byDate.get(date);
      col.push({ date, points: entry?.points ?? 0, breakdown: entry?.breakdown ?? {}, future: cur > end });
    }
    cols.push(col);
  }
  return cols;
}

function Spacer({ className }: { className: string }) {
  return <div className={className} aria-hidden />;
}

export default function ContributionHeatmap({ data }: { data: HeatmapDay[] }) {
  const cols = buildHeatmapGrid(data);
  const total = data.reduce((sum, d) => sum + d.points, 0);
  const [hovered, setHovered] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start scrolled to the most recent week (right edge).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const clampedX = hovered
    ? Math.min(Math.max(hovered.x, 90), (typeof window !== "undefined" ? window.innerWidth : 1000) - 90)
    : 0;

  return (
    <div>
      <p className="text-sm text-[var(--ink-muted)]">
        <b className="text-[var(--ink)]">{total.toLocaleString()}</b> contributions in the last year
      </p>

      <div className="mt-4 -mx-1 px-1">
        <div
          ref={scrollRef}
          className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className={`inline-flex ${GAP}`}>
            {/* Weekday labels — Mon/Wed/Fri; blank spacers keep row heights matched */}
            <div className={`flex shrink-0 flex-col ${GAP} pt-[calc(0.625rem+0.25rem)] sm:pt-[18px]`}>
              {["", "Mon", "", "Wed", "", "Fri", ""].map((label, row) => (
                <div key={row} className={`flex ${SLOT} w-6 shrink-0 items-center sm:w-7 ${LABEL}`}>
                  {label}
                </div>
              ))}
            </div>

            <div>
              {/* Month labels — one per column when the week crosses into a new month */}
              <div className={`flex ${GAP}`}>
                {cols.map((col, i) => {
                  const prevMonth = i > 0 ? cols[i - 1][6].date.slice(0, 7) : null;
                  const thisMonth = col[6].date.slice(0, 7);
                  const isNewMonth = thisMonth !== prevMonth;
                  return (
                    <div
                      key={i}
                      className={`${MONTH_H} w-2.5 shrink-0 overflow-visible whitespace-nowrap sm:w-3.5 ${LABEL}`}
                    >
                      {isNewMonth ? MONTH_LABEL.format(new Date(col[6].date)) : null}
                    </div>
                  );
                })}
              </div>

              <div className={`mt-1 flex ${GAP}`}>
                {cols.map((col, i) => (
                  <div key={i} className={`flex w-2.5 shrink-0 flex-col ${GAP} sm:w-3.5`}>
                    {col.map((cell) =>
                      cell.future ? (
                        <Spacer key={cell.date} className={`${SLOT} shrink-0`} />
                      ) : (
                        <div
                          key={cell.date}
                          onMouseEnter={(e) => setHovered({ cell, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHovered(null)}
                          className={`${SLOT} shrink-0 rounded-[2px] sm:rounded-[3px] ${CELL[level(cell.points)]}`}
                        />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
        <span>Less</span>
        {CELL.map((c, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[2px] sm:h-[11px] sm:w-[11px] ${c}`} />
        ))}
        <span>More</span>
      </div>

      {hovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", left: clampedX, top: hovered.y - 12 }}
            className="pointer-events-none z-50 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs whitespace-nowrap shadow"
          >
            <p className="font-medium text-[var(--ink)]">{fmtDate.format(new Date(hovered.cell.date))}</p>
            <p className="text-[var(--ink-muted)]">
              {hovered.cell.points === 0
                ? "No contributions"
                : `${hovered.cell.points} ${hovered.cell.points === 1 ? "point" : "points"}`}
            </p>
            {Object.entries(hovered.cell.breakdown).map(([action, pts]) => (
              <p key={action} className="text-[var(--ink-muted)]">
                {(ACTION_LABEL[action] ?? action) + ` +${pts}`}
              </p>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
