export const authLabel = "block text-sm font-medium text-[var(--ink)]";

export const authInput = "input-base mt-1.5 py-2 text-[15px] sm:py-2.5";

// Same visual treatment, additionally marked invalid so browsers/AT surface
// the field alongside the top-level AuthAlert (no new validation logic).
export const authInputError =
  "input-base mt-1.5 py-2 text-[15px] sm:py-2.5 border-[var(--danger)]/60 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/40";

export const authHint = "mt-1 text-xs text-[var(--ink-muted)]";

export const authSubmit = "btn-primary w-full py-2.5 text-[15px]";
