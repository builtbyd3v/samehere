import type { ContextLabel } from "@/lib/context-label";

export const CHIP_TONES = ["neutral", "accent", "amber", "green", "coral"] as const;
export type ChipTone = (typeof CHIP_TONES)[number];

// Literal class strings so Tailwind generates them. Tints are 12-16% of the tone.
export const CHIP_TONE_CLASS: Record<ChipTone, string> = {
  neutral: "border border-[var(--hairline-strong)] text-[var(--ink-3)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-2)]",
  amber: "bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-[var(--amber)]",
  green: "bg-[color-mix(in_srgb,var(--green)_12%,transparent)] text-[var(--green)]",
  coral: "bg-[color-mix(in_srgb,var(--coral)_12%,transparent)] text-[var(--coral)]",
};

const LABEL_TONE: Record<ContextLabel, ChipTone> = {
  stuck: "amber",
  building: "accent",
  learning: "green",
  looking_for_team: "coral",
};

/** Chip tone for a post context label (Stuck amber, Building blue, Learning green, Team coral). */
export function labelTone(label: ContextLabel): ChipTone {
  return LABEL_TONE[label];
}

// Index = delay / 40ms. Literal strings so Tailwind generates them.
const REVEAL_DELAYS = [
  "",
  "[animation-delay:40ms]",
  "[animation-delay:80ms]",
  "[animation-delay:120ms]",
  "[animation-delay:160ms]",
  "[animation-delay:200ms]",
  "[animation-delay:240ms]",
  "[animation-delay:280ms]",
  "[animation-delay:320ms]",
  "[animation-delay:360ms]",
  "[animation-delay:400ms]",
  "[animation-delay:440ms]",
  "[animation-delay:480ms]",
] as const;

/** Delay class for <Reveal>: rounds to the nearest 40ms, clamps to 0..480ms. */
export function revealDelayClass(ms: number): string {
  const step = Math.round((Number.isFinite(ms) ? ms : 0) / 40);
  return REVEAL_DELAYS[Math.min(REVEAL_DELAYS.length - 1, Math.max(0, step))];
}
