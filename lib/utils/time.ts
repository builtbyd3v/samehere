// Parse a Postgres timestamp string into a Date, forcing UTC when the string
// carries no timezone.
//
// PostgREST returns a `timestamptz` column with an explicit offset
// ("2026-07-05T12:00:00+00:00") but a plain `timestamp` column WITHOUT one
// ("2026-07-05T12:00:00.123456"). Passing the second form to `new Date()` makes
// JS interpret it as the viewer's LOCAL time even though the DB stores UTC, so
// every "5m ago" / message time ends up shifted by the viewer's offset.
//
// Append 'Z' only when no zone marker (trailing 'Z' or ±HH:MM) is present, so
// already-zoned strings are left exactly as-is.
export function parseTimestamp(iso: string): Date {
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}
