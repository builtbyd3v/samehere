const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmt(iso: string): string {
  const [yyyy, mm] = iso.split("-");
  const monthIndex = Number(mm) - 1;
  const monthName = MONTH_NAMES[monthIndex];
  if (!monthName) return yyyy;
  return `${monthName} ${yyyy}`;
}

export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  legacyTerm: string | null
): string | null {
  if (!startDate) return legacyTerm ?? null;
  const end = endDate ? fmt(endDate) : "Present";
  return `${fmt(startDate)} – ${end}`;
}

export function descriptionBullets(note: string | null): string[] {
  if (!note) return [];
  return note
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
