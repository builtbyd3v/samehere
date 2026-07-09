// Eastern (America/New_York) civil-date helpers — DST-aware, dependency-free,
// no server-only imports, importable from both server and client code. This is
// the one day-boundary every time-gated / auto-incrementing feature in the
// project uses (contribution_log, get_heatmap, get_streak, get_leaderboard —
// see supabase/migrations/20260705130000_growth_wave_b_contribution.sql).
// Direct messages are the deliberate exception (viewer-local) — do not use
// this there.

export type EasternDateParts = { year: number; month: number; day: number };

// en-CA formats as YYYY-MM-DD, giving zero-padded parts to parse.
export function easternDateParts(d: Date): EasternDateParts {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-")
    .map(Number);
  return { year, month, day };
}

// "YYYY-MM-DD" Eastern civil-date key for a real instant — matches Postgres
// `date` columns/returns (contribution_log.date, get_heatmap's `day`) exactly,
// since those are plain dates with no time/timezone component.
export function easternDayKey(d: Date): string {
  const { year, month, day } = easternDateParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// A UTC-midnight Date whose Y/M/D equal the Eastern civil date for `d`. Safe
// to do calendar-day arithmetic on (add/subtract days via setUTCDate) without
// DST or local-tz interference, since UTC has no DST. Do NOT re-run this
// result through easternDateParts/easternDayKey — it's a civil-date stand-in,
// not a real instant, and re-converting it through the America/New_York
// timeZone would shift it by a day.
export function easternCivilDate(d: Date): Date {
  const { year, month, day } = easternDateParts(d);
  return new Date(Date.UTC(year, month - 1, day));
}

// ponytail: run `npx tsx lib/eastern.ts` to sanity-check the Eastern
// day-boundary math every time-gated feature (heatmap/streak/leaderboard)
// depends on.
if (process.argv[1]?.endsWith("eastern.ts")) {
  // Spring-forward, 2026-03-08: EST (UTC-5) still in effect at the midnight
  // boundary (the 2am local jump to EDT happens later the same day).
  console.assert(easternDayKey(new Date("2026-03-08T04:59:00Z")) === "2026-03-07", "just before Eastern midnight, pre-DST-jump day");
  console.assert(easternDayKey(new Date("2026-03-08T05:00:00Z")) === "2026-03-08", "just after Eastern midnight, pre-DST-jump day");

  // Fall-back, 2026-11-01: EDT (UTC-4) still in effect at the midnight
  // boundary (the 2am local fall-back to EST happens later the same day).
  console.assert(easternDayKey(new Date("2026-11-01T03:59:00Z")) === "2026-10-31", "just before Eastern midnight, fall-back day");
  console.assert(easternDayKey(new Date("2026-11-01T04:00:00Z")) === "2026-11-01", "just after Eastern midnight, fall-back day");

  // Ordinary (non-DST-transition) evening drift window — this is the actual
  // bug: at 02:00 UTC the browser's UTC calendar date has already rolled to
  // the 9th, but Eastern (EDT, UTC-4) is still on the 8th until 04:00 UTC.
  console.assert(easternDayKey(new Date("2026-07-09T02:00:00Z")) === "2026-07-08", "UTC date rolled over, Eastern (EDT) still on the prior day");
  console.assert(easternDayKey(new Date("2026-07-09T04:00:00Z")) === "2026-07-09", "just after Eastern (EDT) midnight");

  // easternCivilDate is a UTC-midnight stand-in for the civil date — its own
  // Y/M/D (read back via toISOString) must equal easternDayKey for the same instant.
  const check = new Date("2026-11-01T03:59:00Z");
  console.assert(
    easternCivilDate(check).toISOString().slice(0, 10) === easternDayKey(check),
    "easternCivilDate's UTC-midnight stand-in must match easternDayKey",
  );

  console.log("eastern tz self-check passed");
}
