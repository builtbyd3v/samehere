import { describe, it, expect } from "vitest";
import { parseContextLabel, contextLabelError, CONTEXT_LABEL_COLOR, CONTEXT_LABELS } from "./context-label";

describe("parseContextLabel", () => {
  it("accepts the allowlisted labels", () => {
    expect(parseContextLabel("building")).toBe("building");
    expect(parseContextLabel("Learning")).toBe("learning");
    expect(parseContextLabel("  STUCK  ")).toBe("stuck");
    expect(parseContextLabel("Looking_for_team")).toBe("looking_for_team");
  });

  it("treats empty as unlabeled", () => {
    expect(parseContextLabel(null)).toBeNull();
    expect(parseContextLabel("")).toBeNull();
    expect(parseContextLabel("   ")).toBeNull();
  });

  it("rejects unknown values instead of coercing them", () => {
    expect(parseContextLabel("built")).toBeNull();
    expect(parseContextLabel("ai")).toBeNull();
    expect(parseContextLabel("teammate")).toBeNull();
  });
});

describe("CONTEXT_LABELS", () => {
  it("includes Looking for team as the fourth label", () => {
    expect(CONTEXT_LABELS).toEqual(["building", "learning", "stuck", "looking_for_team"]);
  });
});

describe("CONTEXT_LABEL_COLOR", () => {
  it("maps each label to its own token", () => {
    expect(CONTEXT_LABEL_COLOR.stuck).toBe("var(--label-stuck)");
    expect(CONTEXT_LABEL_COLOR.building).toBe("var(--label-building)");
    expect(CONTEXT_LABEL_COLOR.learning).toBe("var(--label-learning)");
    expect(CONTEXT_LABEL_COLOR.looking_for_team).toBe("var(--label-team)");
  });
});

describe("contextLabelError", () => {
  it("allows empty and allowlisted values", () => {
    expect(contextLabelError("")).toBeNull();
    expect(contextLabelError("building")).toBeNull();
    expect(contextLabelError("looking_for_team")).toBeNull();
  });

  it("errors on junk so createPost can refuse it", () => {
    expect(contextLabelError(" intern ")).toBe(
      "Pick Building, Learning, Stuck, Looking for team, or none.",
    );
  });
});
