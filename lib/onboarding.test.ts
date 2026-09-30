import { describe, expect, it } from "vitest";
import type { PortfolioPublishFlags } from "@/types/portfolio";
import {
  consentWrite,
  onboardingPrefill,
  parseOnboardingSource,
  parseStepsDone,
  shouldRedirectToOnboarding,
} from "./onboarding";

describe("parseStepsDone", () => {
  it("returns nothing for non-array input", () => {
    expect(parseStepsDone(undefined)).toEqual([]);
    expect(parseStepsDone("basics")).toEqual([]);
    expect(parseStepsDone({})).toEqual([]);
  });

  it("keeps known steps, dedupes, and sorts canonically", () => {
    expect(parseStepsDone(["experience", "basics", "junk", 3, "basics"])).toEqual(["basics", "experience"]);
  });
});

describe("parseOnboardingSource", () => {
  it("is redirect only for the exact redirect value", () => {
    expect(parseOnboardingSource("redirect")).toBe("redirect");
    expect(parseOnboardingSource("link")).toBe("link");
    expect(parseOnboardingSource("x")).toBe("link");
    expect(parseOnboardingSource(undefined)).toBe("link");
    expect(parseOnboardingSource(["redirect"])).toBe("link");
  });
});

describe("shouldRedirectToOnboarding", () => {
  it("never redirects on a failed read", () => {
    expect(shouldRedirectToOnboarding(null)).toBe(false);
  });

  it("redirects only while onboarded_at is null", () => {
    expect(shouldRedirectToOnboarding({ onboarded_at: null })).toBe(true);
    expect(shouldRedirectToOnboarding({ onboarded_at: "2026-01-01T00:00:00Z" })).toBe(false);
  });
});

describe("onboardingPrefill", () => {
  const base = { stage: "building", focus_areas: ["web", "ai_ml"], open_to: ["study", "junk"] };
  const consent = (education: boolean) => ({
    publish_intro: true,
    publish_projects: true,
    publish_experience: true,
    publish_education: education,
  });

  it("starts from saved values and pre-checks consent when there is no settings row", () => {
    expect(onboardingPrefill(base, null)).toEqual({
      stage: "building",
      focus: ["web", "ai_ml"],
      openTo: ["study"],
      publishChecked: true,
    });
  });

  it("drops junk stage and focus", () => {
    expect(onboardingPrefill({ ...base, stage: "nope" }, null).stage).toBe("");
    expect(onboardingPrefill({ ...base, focus_areas: ["blockchain"] }, null).focus).toEqual([]);
  });

  it("gives empty values for all-null profile fields", () => {
    expect(onboardingPrefill({ stage: null, focus_areas: null, open_to: null }, null)).toEqual({
      stage: "",
      focus: [],
      openTo: [],
      publishChecked: true,
    });
  });

  it("checks consent only when the saved row has all four sections public", () => {
    expect(onboardingPrefill(base, undefined).publishChecked).toBe(false);
    expect(onboardingPrefill(base, consent(true)).publishChecked).toBe(true);
    expect(onboardingPrefill(base, consent(false)).publishChecked).toBe(false);
  });
});

describe("consentWrite", () => {
  const flags = (on: boolean, overrides: Partial<PortfolioPublishFlags> = {}): PortfolioPublishFlags => ({
    publish_intro: on,
    publish_projects: on,
    publish_experience: on,
    publish_education: on,
    publish_activity: false,
    publish_posts: true,
    allow_indexing: false,
    ...overrides,
  });

  it("publishes the four sections on first check and keeps the other flags", () => {
    expect(consentWrite(flags(false), true)).toEqual(flags(true));
  });

  it("writes nothing when the box matches what is saved", () => {
    expect(consentWrite(flags(false), false)).toBeNull();
    expect(consentWrite(flags(true), true)).toBeNull();
  });

  it("unpublishes the four sections when unchecked and keeps the other flags", () => {
    expect(consentWrite(flags(true), false)).toEqual(flags(false));
  });

  it("leaves a partial setup alone when unchecked and completes it when checked", () => {
    const partial = flags(false, { publish_intro: true });
    expect(consentWrite(partial, false)).toBeNull();
    expect(consentWrite(partial, true)).toEqual(flags(true));
  });
});
