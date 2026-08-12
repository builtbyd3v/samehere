import { describe, expect, it } from "vitest";
import {
  isUiRecipe,
  pickRecipeFallback,
  resolveUiRecipe,
} from "./recipe-fallback";

describe("pickRecipeFallback", () => {
  it("picks prep_room when interviewing", () => {
    expect(
      pickRecipeFallback({
        stage: "interviewing",
        constraints: ["overwhelmed", "limited_network"],
      }),
    ).toBe("prep_room");
  });

  it("picks focus_track for overwhelmed / focus constraints", () => {
    expect(
      pickRecipeFallback({ stage: "applying", constraints: ["overwhelmed"] }),
    ).toBe("focus_track");
    expect(
      pickRecipeFallback({ stage: "building", constraints: ["working_job"] }),
    ).toBe("focus_track");
  });

  it("picks studio for early stages without focus constraints", () => {
    expect(pickRecipeFallback({ stage: "no_experience" })).toBe("studio");
    expect(pickRecipeFallback({ stage: "building" })).toBe("studio");
  });

  it("picks network_gap when limited network and profile is strong", () => {
    expect(
      pickRecipeFallback({
        stage: "applying",
        constraints: ["limited_network"],
        profileStrong: true,
      }),
    ).toBe("network_gap");
  });

  it("defaults to ops_desk", () => {
    expect(pickRecipeFallback({ stage: "applying" })).toBe("ops_desk");
    expect(
      pickRecipeFallback({
        stage: "applying",
        constraints: ["limited_network"],
        profileStrong: false,
      }),
    ).toBe("ops_desk");
  });
});

describe("resolveUiRecipe", () => {
  it("keeps a valid model recipe", () => {
    expect(
      resolveUiRecipe("studio", { stage: "interviewing" }),
    ).toBe("studio");
  });

  it("falls back when the model recipe is invalid", () => {
    expect(
      resolveUiRecipe("dashboard", { stage: "interviewing" }),
    ).toBe("prep_room");
    expect(isUiRecipe("ops_desk")).toBe(true);
    expect(isUiRecipe("nope")).toBe(false);
  });
});
