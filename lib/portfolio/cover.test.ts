import { describe, expect, it } from "vitest";
import { PROJECT_COVERS, projectCoverClass } from "./cover";

const IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("projectCoverClass", () => {
  it("is stable per id", () => {
    expect(projectCoverClass("p-1")).toBe(projectCoverClass("p-1"));
  });
  it("always picks a known cover", () => {
    for (const id of IDS) expect(PROJECT_COVERS).toContain(projectCoverClass(id));
  });
  it("spreads ids across covers", () => {
    expect(new Set(IDS.map(projectCoverClass)).size).toBeGreaterThanOrEqual(2);
  });
});
