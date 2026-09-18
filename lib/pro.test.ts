import { describe, expect, it } from "vitest";
import { isPro, proCapabilities, welcomeAfterCheckout } from "./pro";

const free = { is_pro: false, pro_until: null };
const comped = { is_pro: true, pro_until: null };
const activeUntil = { is_pro: true, pro_until: "2099-01-01T00:00:00.000Z" };
const expiredFlagOn = { is_pro: true, pro_until: "2020-01-01T00:00:00.000Z" };
const expiredFlagOff = { is_pro: false, pro_until: "2020-01-01T00:00:00.000Z" };
const futureUntilNoFlag = { is_pro: false, pro_until: "2099-01-01T00:00:00.000Z" };

describe("isPro", () => {
  it("treats Free, expired, and flag-only-future as not Pro", () => {
    expect(isPro(free)).toBe(false);
    expect(isPro(expiredFlagOn)).toBe(false);
    expect(isPro(expiredFlagOff)).toBe(false);
    expect(isPro(futureUntilNoFlag)).toBe(false);
  });

  it("treats comped and unexpired grants as Pro", () => {
    expect(isPro(comped)).toBe(true);
    expect(isPro(activeUntil)).toBe(true);
  });
});

describe("proCapabilities", () => {
  it("opens theme, banner, avatar, section order, and analytics only while current Pro", () => {
    expect(proCapabilities(free)).toEqual({
      customizeAppearance: false,
      reorderSections: false,
      readAnalytics: false,
      higherAnalysisAllowance: false,
    });
    expect(proCapabilities(expiredFlagOn)).toEqual({
      customizeAppearance: false,
      reorderSections: false,
      readAnalytics: false,
      higherAnalysisAllowance: false,
    });
    expect(proCapabilities(comped)).toEqual({
      customizeAppearance: true,
      reorderSections: true,
      readAnalytics: true,
      higherAnalysisAllowance: true,
    });
    expect(proCapabilities(activeUntil).readAnalytics).toBe(true);
  });
});

describe("welcomeAfterCheckout", () => {
  it("does not assert Pro from upgraded=1 alone", () => {
    expect(welcomeAfterCheckout("1", free)).toBe(false);
    expect(welcomeAfterCheckout("1", expiredFlagOn)).toBe(false);
    expect(welcomeAfterCheckout("1", comped)).toBe(true);
    expect(welcomeAfterCheckout(undefined, activeUntil)).toBe(false);
  });
});
