import { describe, it, expect } from "vitest";
import { parseContextLabel, contextLabelError } from "./context-label";

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

describe("contextLabelError", () => {
  it("allows empty and allowlisted values", () => {
    expect(contextLabelError("")).toBeNull();
    expect(contextLabelError("building")).toBeNull();
  });

  it("errors on junk so createPost can refuse it", () => {
    expect(contextLabelError(" intern ")).toBe("Pick Building, Learning, Stuck, or none.");
  });
});
