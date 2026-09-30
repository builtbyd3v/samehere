import { FOCUS_AREAS, FOCUS_LABELS, STAGE_LABELS, parseStage } from "@/lib/stage";

const stageChip = "rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink)]";
const focusChip = "rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink-muted)]";

type StageChipsProps = { stage: string | null | undefined; focusAreas: readonly string[] | null | undefined };

export default function StageChips({ stage, focusAreas }: StageChipsProps) {
  const s = parseStage(stage);
  const areas = FOCUS_AREAS.filter((a) => (focusAreas ?? []).includes(a));
  if (!s && areas.length === 0) return null;
  return (
    <>
      {s ? <span className={stageChip}>{STAGE_LABELS[s]}</span> : null}
      {areas.map((a) => (
        <span key={a} className={focusChip}>
          {FOCUS_LABELS[a]}
        </span>
      ))}
    </>
  );
}
