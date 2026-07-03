"use client";

// Client component — hover needs state for the styled tooltip (native `title`
// can't be styled). Grid-building stays a pure function so it's easy to test.
// Visual (blue ramp, level thresholds, legend) mirrors the landing showcase so
// the real profile heatmap and the marketing one stay identical.
// The 1Y/6M/3M period sorter is the Pro "sortable heatmap" feature (Phase 15) —
// v1 is a fixed 52-week grid.

import { useState, useEffect, useRef } from "react";

export type HeatmapDay = { day: string; points: number; breakdown: Record<string, number> };
type Cell = { date: string; points: number; breakdown: Record<string, number>; future: boolean };

// Blue heatmap ramp — same tokens as ProfileShowcase.
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

// Sun-aligned 53-column grid (52 weeks back + the current week), one row per
// weekday. Days after today in the current week are `future` (rendered blank so
// column alignment holds). UTC throughout.
// ponytail: dates in UTC; day-boundary drift near local midnight not handled.
export function buildHeatmapGrid(data: HeatmapDay[], today: Date = new Date()): Cell[][] {
  const byDate = new Map(data.map((d) => [d.day, d]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const firstSunday = new Date(end);
  // Back up to this week's Sunday, then 52 more weeks.
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

// Blank spacer for a column/row that has no label this frame — keeps the grid
// (labels + cells) column-aligned since every column renders the same slots.
function Spacer({ className }: { className: string }) {
  return <div className={className} />;
}

export default function ContributionHeatmap({ data }: { data: HeatmapDay[] }) {
  const cols = buildHeatmapGrid(data);
  const total = data.reduce((sum, d) => sum + d.points, 0);
  const [hovered, setHovered] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

      <div className="mt-4">
        <div ref={scrollRef} className="overflow-x-auto">
          <div className="inline-flex min-w-full gap-2">
            {/* Weekday row labels — Mon/Wed/Fri at rows 1/3/5, blank spacers elsewhere. */}
            <div className="flex shrink-0 flex-col gap-[3px] pt-[18px]">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((label, row) => (
                <div key={row} className="flex h-[14px] w-7 items-center text-[11px] text-[var(--ink-faint)]">
                  {label}
                </div>
              ))}
            </div>

            <div>
              {/* Month labels — one per column whose first day starts a new month. */}
              <div className="flex gap-[3px]">
                {cols.map((col, i) => {
                  const prevMonth = i > 0 ? cols[i - 1][0].date.slice(0, 7) : null;
                  const thisMonth = col[0].date.slice(0, 7);
                  const isNewMonth = thisMonth !== prevMonth;
                  return (
                    <div key={i} className="h-[14px] w-[14px] text-[11px] whitespace-nowrap text-[var(--ink-faint)]">
                      {isNewMonth ? MONTH_LABEL.format(new Date(col[0].date)) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 flex gap-[3px]">
                {cols.map((col, i) => (
                  <div key={i} className="flex w-[14px] shrink-0 flex-col gap-[3px]">
                    {col.map((cell, j) =>
                      cell.future ? (
                        // Blank spacer keeps the current week's column aligned.
                        <Spacer key={cell.date} className="h-[14px] w-[14px]" />
                      ) : (
                        <div
                          key={cell.date}
                          onMouseEnter={(e) => setHovered({ cell, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHovered(null)}
                          className={`relative h-[14px] w-[14px] rounded-[3px] ${CELL[level(cell.points)]}`}
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
          <span key={i} className={`h-[11px] w-[11px] rounded-[2px] ${c}`} />
        ))}
        <span>More</span>
      </div>

      {hovered && (
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
        </div>
      )}
    </div>
  );
}
