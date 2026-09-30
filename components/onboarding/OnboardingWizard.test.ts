import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/onboarding/actions", () => ({
  saveOnboardingBasics: vi.fn(),
  saveOnboardingStage: vi.fn(),
  finishOnboarding: vi.fn(),
  savePortfolioConsent: vi.fn(),
}));
vi.mock("@/app/(app)/profile/edit/actions", () => ({ uploadAvatar: vi.fn(), addExperience: vi.fn(), addEducation: vi.fn() }));
vi.mock("@/app/(app)/feed/actions", () => ({ createPost: vi.fn() }));

import OnboardingWizard from "./OnboardingWizard";

const profile = { username: "ada", display_name: "Ada", avatar_url: null, school: "", year: null, major: null, bio: null };
const html = renderToStaticMarkup(createElement(OnboardingWizard, { profile }));
const count = (re: RegExp) => (html.match(re) ?? []).length;

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

describe("OnboardingWizard wiring", () => {
  it("still calls every onboarding action", () => {
    const src = readFileSync("components/onboarding/OnboardingWizard.tsx", "utf8");
    for (const call of [
      "saveOnboardingStage(",
      "saveOnboardingBasics(",
      "createPost(",
      "addEducation(",
      "addExperience(",
      "savePortfolioConsent(",
      "finishOnboarding(stepsDone)",
    ]) {
      expect(src).toContain(call);
    }
  });
});
