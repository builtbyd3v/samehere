export const ONBOARDING_STEPS = ["basics", "post", "education", "experience"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Server-action input is untrusted: keep known step names, dedupe, canonical order. */
export function parseStepsDone(raw: unknown): OnboardingStep[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(raw.filter((v): v is string => typeof v === "string"));
  return ONBOARDING_STEPS.filter((step) => seen.has(step));
}
