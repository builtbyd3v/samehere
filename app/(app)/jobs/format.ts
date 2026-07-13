// Shared posting-age helpers for the jobs board + detail page. Server-rendered,
// so Date.now() is evaluated once per request; no hydration mismatch concerns.

export function relAge(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days <= 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isNew(iso: string | null): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < 48 * 3_600_000;
}
