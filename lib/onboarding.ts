import type { OpenToTag, PortfolioPublishFlags } from "@/types/portfolio";
import { OPEN_TO_TAGS } from "@/lib/portfolio/validation";
import { parseFocusAreas, parseStage, type FocusArea, type Stage } from "@/lib/stage";

export const ONBOARDING_STEPS = ["basics", "post", "education", "experience"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Server-action input is untrusted: keep known step names, dedupe, canonical order. */
export function parseStepsDone(raw: unknown): OnboardingStep[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(raw.filter((v): v is string => typeof v === "string"));
  return ONBOARDING_STEPS.filter((step) => seen.has(step));
}

export type OnboardingSource = "redirect" | "link";

/** `?from=redirect` is set only by the one-time /feed redirect; everything else is a link visit. */
export function parseOnboardingSource(raw: unknown): OnboardingSource {
  return raw === "redirect" ? "redirect" : "link";
}

/** Null profile means the read failed: never redirect on a failed read. */
export function shouldRedirectToOnboarding(profile: { onboarded_at: string | null } | null): boolean {
  return profile !== null && profile.onboarded_at === null;
}

const CONSENT_SECTIONS = ["publish_intro", "publish_projects", "publish_experience", "publish_education"] as const;
export type ConsentFlags = Pick<PortfolioPublishFlags, (typeof CONSENT_SECTIONS)[number]>;
const consentOn = (flags: ConsentFlags) => CONSENT_SECTIONS.every((key) => flags[key]);

export type OnboardingPrefill = { stage: Stage | ""; focus: FocusArea[]; openTo: OpenToTag[]; publishChecked: boolean };

/**
 * Step 1 starts from the saved values. Consent box: null settings = no row yet (first time), pre-checked;
 * undefined = the read failed, never pre-checked; a row = checked only when all four sections are public.
 */
export function onboardingPrefill(
  profile: { stage: string | null; focus_areas: string[] | null; open_to: string[] | null },
  settings: ConsentFlags | null | undefined,
): OnboardingPrefill {
  const focus = parseFocusAreas(profile.focus_areas ?? []);
  const openTo = profile.open_to ?? [];
  return {
    stage: parseStage(profile.stage) ?? "",
    focus: focus.ok ? focus.data : [],
    openTo: OPEN_TO_TAGS.filter((tag) => openTo.includes(tag)),
    publishChecked: settings === null ? true : settings === undefined ? false : consentOn(settings),
  };
}

/** Flags to save for the consent box, or null when the box matches what is saved (write nothing). */
export function consentWrite(current: PortfolioPublishFlags, checked: boolean): PortfolioPublishFlags | null {
  if (checked === consentOn(current)) return null;
  return {
    publish_intro: checked,
    publish_projects: checked,
    publish_experience: checked,
    publish_education: checked,
    publish_activity: current.publish_activity,
    publish_posts: current.publish_posts,
    allow_indexing: current.allow_indexing,
  };
}
