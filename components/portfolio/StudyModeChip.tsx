import { STUDY_MODES } from "@/lib/portfolio/validation";
import { STUDY_MODE_LABELS } from "@/lib/portfolio/labels";
import type { StudyMode } from "@/types/portfolio";

const MODES = new Set<string>(STUDY_MODES);

export default function StudyModeChip({ mode }: { mode: string | null | undefined }) {
  if (!mode || !MODES.has(mode)) return null;
  return (
    <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink)]">
      {STUDY_MODE_LABELS[mode as StudyMode]}
    </span>
  );
}
