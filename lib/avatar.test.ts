import { describe, it, expect } from "vitest";
import { avatarColor, avatarInitial } from "./avatar";

describe("avatarColor", () => {
  it("is deterministic per seed", () => {
    expect(avatarColor("dev")).toBe(avatarColor("dev"));
  });
  it("gives different seeds different hues (usually)", () => {
    expect(avatarColor("dev")).not.toBe(avatarColor("maya"));
  });
  it("always returns a valid hsl from the curated set", () => {
    for (const s of ["", "a", "j_chen", "aisha99", "🎉"]) {
      expect(avatarColor(s)).toMatch(/^hsl\(\d+ 58% 48%\)$/);
    }
  });
});

describe("avatarInitial", () => {
  it("takes first alphanumeric, uppercased", () => {
    expect(avatarInitial("dev")).toBe("D");
    expect(avatarInitial("_maya")).toBe("M");
    expect(avatarInitial("99bottles")).toBe("9");
  });
  it("falls back to ? when empty or symbol-only", () => {
    expect(avatarInitial("")).toBe("?");
    expect(avatarInitial("...")).toBe("?");
  });
});
