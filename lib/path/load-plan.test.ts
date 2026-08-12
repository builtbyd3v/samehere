import { describe, expect, it } from "vitest";
import { normalizePathPlanUi, pathPlanOrFixture } from "./load-plan";
import { DEFAULT_PATH_PLAN_UI } from "./fixtures";

describe("normalizePathPlanUi", () => {
  it("accepts a valid plan ui object", () => {
    const plan = normalizePathPlanUi({
      ui_recipe: "ops_desk",
      module_order: ["opportunities", "applications"],
      nav_emphasis: ["opportunities"],
      tone: "steady",
      headline: "Move today's application forward",
      why: "You have enough proof.",
    });
    expect(plan?.ui_recipe).toBe("ops_desk");
    expect(plan?.module_order).toEqual(["opportunities", "applications"]);
  });

  it("rejects invalid recipe or empty modules", () => {
    expect(normalizePathPlanUi({ ui_recipe: "dashboard" })).toBeNull();
    expect(
      normalizePathPlanUi({
        ui_recipe: "studio",
        module_order: [],
        nav_emphasis: [],
        tone: "steady",
        headline: "x",
        why: "y",
      }),
    ).toBeNull();
  });
});

describe("pathPlanOrFixture", () => {
  it("falls back to the studio fixture", () => {
    expect(pathPlanOrFixture(null)).toEqual(DEFAULT_PATH_PLAN_UI);
  });
});
