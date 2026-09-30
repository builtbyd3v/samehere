import { describe, expect, it } from "vitest";
import { parseStepsDone } from "./onboarding";

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
