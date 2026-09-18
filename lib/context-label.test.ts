import { describe, it, expect } from "vitest";
import { parseContextLabel, contextLabelError, CONTEXT_LABEL_CHIP } from "./context-label";

describe("parseContextLabel", () => {
  it("accepts the three allowlisted labels", () => {
    expect(parseContextLabel("building")).toBe("building");
    expect(parseContextLabel("Learning")).toBe("learning");
    expect(parseContextLabel("  STUCK  ")).toBe("stuck");
  });

  it("treats empty as unlabeled", () => {
    expect(parseContextLabel(null)).toBeNull();
    expect(parseContextLabel("")).toBeNull();
    expect(parseContextLabel("   ")).toBeNull();
  });

  it("rejects unknown values instead of coercing them", () => {
    expect(parseContextLabel("built")).toBeNull();
    expect(parseContextLabel("ai")).toBeNull();
  });
});

describe("CONTEXT_LABEL_CHIP", () => {
  it("keeps the three labels visually distinct", () => {
    expect(CONTEXT_LABEL_CHIP.stuck).toContain("stuck");
    expect(CONTEXT_LABEL_CHIP.building).toContain("building");
    expect(CONTEXT_LABEL_CHIP.learning).toContain("learning");
  });
});

describe("contextLabelError", () => {
  it("allows empty and allowlisted values", () => {
    expect(contextLabelError("")).toBeNull();
    expect(contextLabelError("building")).toBeNull();
  });

  it("errors on junk so createPost can refuse it", () => {
    expect(contextLabelError(" intern ")).toBe("Pick Building, Learning, Stuck, or none.");
  });
});
