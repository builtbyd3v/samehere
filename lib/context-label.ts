import type { ContextLabel } from "@/types/portfolio";

export type { ContextLabel };

export const CONTEXT_LABELS = ["building", "learning", "stuck", "looking_for_team"] as const;

export const CONTEXT_LABEL_COPY: Record<ContextLabel, string> = {
  building: "Building",
  learning: "Learning",
  stuck: "Stuck",
  looking_for_team: "Looking for team",
};

export const COMPOSER_LABEL_COPY: Record<ContextLabel, string> = {
  building: "Building",
  learning: "Learning",
  stuck: "Stuck",
  looking_for_team: "Team",
};

export const CONTEXT_LABEL_COLOR: Record<ContextLabel, string> = {
  building: "var(--label-building)",
  learning: "var(--label-learning)",
  stuck: "var(--label-stuck)",
  looking_for_team: "var(--label-team)",
};

export const COMPOSER_LABELS: readonly ContextLabel[] = ["stuck", "building", "learning", "looking_for_team"];

export function parseContextLabel(raw: unknown): ContextLabel | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return null;
  if ((CONTEXT_LABELS as readonly string[]).includes(s)) return s as ContextLabel;
  return null;
}

/** Empty is fine. Non-empty junk is an error. */
export function contextLabelError(raw: unknown): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  if (parseContextLabel(raw)) return null;
  return "Pick Building, Learning, Stuck, Looking for team, or none.";
}
