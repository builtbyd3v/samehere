import type { ReactNode } from "react";
import { CHIP_TONE_CLASS, type ChipTone } from "@/lib/ui/primitives";

type ChipSize = "sm" | "md";

const CHIP_SIZE: Record<ChipSize, string> = {
  sm: "h-[22px] px-2 text-[11px]",
  md: "h-7 px-2.5 text-xs",
};

/** Small status pill. Display only; wrap it in a button or link for interaction. */
export function Chip({
  tone = "neutral",
  size = "sm",
  className = "",
  children,
}: {
  tone?: ChipTone;
  size?: ChipSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium leading-none ${CHIP_SIZE[size]} ${CHIP_TONE_CLASS[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/**
 * Stage color dot. `stage` is a `STAGES` id from lib/stage.ts (plan 004); the
 * color comes from `.stage-dot[data-stage]` in app/globals.css, unknown ids get
 * the faint color.
 */
export function StageDot({ stage, size = "sm", className = "" }: { stage: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      data-stage={stage}
      className={`stage-dot inline-block shrink-0 rounded-full ${size === "sm" ? "size-1.5" : "size-2"} ${className}`.trim()}
    />
  );
}

/** Dot plus label. Callers pass `label={STAGE_LABELS[stage]}` from lib/stage.ts. */
export function StageChip({ stage, label, size = "sm" }: { stage: string; label: string; size?: ChipSize }) {
  return (
    <Chip size={size}>
      <StageDot stage={stage} />
      {label}
    </Chip>
  );
}

/**
 * Focus area pill (onboarding picker, filters). 44px tall on phones, 36px from
 * `sm`. Visual only: put it inside a <label> with a visually hidden checkbox.
 */
export function FocusChip({ label, selected = false, className = "" }: { label: string; selected?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium sm:h-9 ${
        selected
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
          : "border-[var(--border)] bg-[var(--fill-1)] text-[var(--ink-3)]"
      } ${className}`.trim()}
    >
      {label}
    </span>
  );
}
