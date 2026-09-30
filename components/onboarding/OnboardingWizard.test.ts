import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/onboarding/actions", () => ({
  saveOnboardingBasics: vi.fn(),
  saveOnboardingStage: vi.fn(),
  finishOnboarding: vi.fn(),
  savePortfolioConsent: vi.fn(),
  startOnboarding: vi.fn(),
}));
vi.mock("@/app/(app)/profile/edit/actions", () => ({ uploadAvatar: vi.fn(), addExperience: vi.fn(), addEducation: vi.fn() }));
vi.mock("@/app/(app)/feed/actions", () => ({ createPost: vi.fn() }));

import OnboardingWizard from "./OnboardingWizard";

const profile = { username: "ada", display_name: "Ada", avatar_url: null, school: "", year: null, major: null, bio: null };
const html = renderToStaticMarkup(
  createElement(OnboardingWizard, {
    profile,
    prefill: { stage: "", focus: [], openTo: [], publishChecked: true },
    source: "link",
  }),
);
const prefilled = renderToStaticMarkup(
  createElement(OnboardingWizard, {
    profile,
    prefill: { stage: "building", focus: ["web"], openTo: ["study"], publishChecked: true },
    source: "redirect",
  }),
);
const count = (re: RegExp, src = html) => (src.match(re) ?? []).length;

describe("OnboardingWizard stage step", () => {
  it("renders the stage choice as a native radio group", () => {
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(count(/type="radio"/g)).toBe(6);
    expect(count(/name="stage"/g)).toBe(6);
  });

  it("renders focus and open-to chips as native checkboxes", () => {
    expect(count(/<input[^>]*type="checkbox"[^>]*name="focus_areas"/g)).toBe(10);
    expect(count(/name="focus_areas"/g)).toBe(10);
    expect(count(/<input[^>]*type="checkbox"[^>]*name="open_to"/g)).toBe(3);
    expect(count(/name="open_to"/g)).toBe(3);
  });

  it("exposes progress as a progressbar with no inline width", () => {
    expect(html).toMatch(/role="progressbar"/);
    expect(html).toMatch(/aria-valuemax="6"/);
    expect(html).toMatch(/aria-valuenow="1"/);
    expect(html).not.toMatch(/style="width/);
  });

  it("has exactly one h1, with the serif phrase", () => {
    expect(count(/<h1/g)).toBe(1);
    expect(html).toMatch(/<h1[^>]*>[\s\S]*right now\?[\s\S]*<\/h1>/);
  });

  it("starts with Continue disabled until a stage is picked", () => {
    expect(html).toMatch(/<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/);
  });
});

describe("OnboardingWizard entry and safety", () => {
  it("renders saved stage, focus, and open-to as checked", () => {
    // React serializes checked before value.
    expect(prefilled).toMatch(/checked="" value="building"/);
    expect(prefilled).toMatch(/checked="" value="web"/);
    expect(prefilled).toMatch(/checked="" value="study"/);
    expect(count(/checked=""/g, prefilled)).toBe(3);
    expect(count(/checked=""/g)).toBe(0);
  });

  it("enables Continue when a stage is prefilled", () => {
    expect(prefilled).not.toMatch(/<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/);
  });

  it("has no Optional label and no Skip on step 1", () => {
    expect(html).not.toContain("Optional");
    expect(html).not.toMatch(/>Skip( for now)?</);
  });

  it("labels the header control Finish later", () => {
    expect(html).toContain(">Finish later</button>");
  });

  it("renders stage hints on phones", () => {
    expect(count(/id="stage-hint-/g)).toBe(6);
    expect(html).not.toMatch(/id="stage-hint-[a-z_]+" class="hidden/);
  });
});

describe("OnboardingWizard wiring", () => {
  const src = readFileSync("components/onboarding/OnboardingWizard.tsx", "utf8");

  it("still calls every onboarding action", () => {
    for (const call of [
      "saveOnboardingStage(",
      "saveOnboardingBasics(",
      "createPost(",
      "addEducation(",
      "addExperience(",
      "savePortfolioConsent(",
      "finishOnboarding(stepsDone)",
      "startOnboarding(source)",
    ]) {
      expect(src).toContain(call);
    }
  });

  it("keeps the consent copy honest and the box prefilled from saved state", () => {
    expect(src).toContain("make your account private in Settings");
    expect(src).toContain("defaultChecked={prefill.publishChecked}");
    expect(src).not.toContain("stay private");
  });
});
