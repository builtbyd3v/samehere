import { describe, it, expect } from "vitest";
import { AVATAR_TINTS, avatarInitials, avatarTintClass } from "./avatar";

describe("avatarTintClass", () => {
  it("is deterministic per seed", () => {
    expect(avatarTintClass("dev")).toBe(avatarTintClass("dev"));
  });
  it("always returns one of the curated tints", () => {
    for (const s of ["", "a", "j_chen", "aisha99", "🎉"]) {
      expect(AVATAR_TINTS).toContain(avatarTintClass(s));
    }
  });
  it("spreads seeds across the palette", () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `user${i}`);
    expect(new Set(seeds.map(avatarTintClass)).size).toBeGreaterThanOrEqual(4);
  });
});

describe("avatarInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(avatarInitials("Maya Rivera")).toBe("MR");
    expect(avatarInitials("maya rivera lopez")).toBe("MR");
    expect(avatarInitials("j_chen")).toBe("JC");
  });
  it("uses one letter for one word", () => {
    expect(avatarInitials("dev")).toBe("D");
    expect(avatarInitials("_maya")).toBe("M");
    expect(avatarInitials("99bottles")).toBe("9");
  });
  it("keeps non-ASCII letters", () => {
    expect(avatarInitials("Élodie Martin")).toBe("ÉM");
  });
  it("falls back to ? when empty or symbol-only", () => {
    expect(avatarInitials("")).toBe("?");
    expect(avatarInitials("...")).toBe("?");
    expect(avatarInitials("🎉")).toBe("?");
  });
});
