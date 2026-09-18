import type { ContextLabel } from "@/types/portfolio";

export type { ContextLabel };

export const CONTEXT_LABELS = ["building", "learning", "stuck"] as const;

export const CONTEXT_LABEL_COPY: Record<ContextLabel, string> = {
  building: "Building",
  learning: "Learning",
  stuck: "Stuck",
};

export const CONTEXT_LABEL_CHIP: Record<ContextLabel, string> = {
  building: "label-chip label-chip-building",
  learning: "label-chip label-chip-learning",
  stuck: "label-chip label-chip-stuck",
};

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
  return "Pick Building, Learning, Stuck, or none.";
}
