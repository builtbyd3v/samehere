import { describe, expect, it } from "vitest";
import { resolveBrandMode } from "./mode";

describe("resolveBrandMode", () => {
  it("plays intro only when not yet played and motion is allowed", () => {
    expect(resolveBrandMode({ played: false, reduceMotion: false })).toBe("animated");
  });

  it("stays settled after intro or when reduced motion is on", () => {
    expect(resolveBrandMode({ played: true, reduceMotion: false })).toBe("settled");
    expect(resolveBrandMode({ played: false, reduceMotion: true })).toBe("settled");
    expect(resolveBrandMode({ played: true, reduceMotion: true })).toBe("settled");
  });
});
