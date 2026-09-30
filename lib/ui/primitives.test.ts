import { describe, expect, it } from "vitest";
import { CONTEXT_LABELS } from "@/lib/context-label";
import { CHIP_TONES, CHIP_TONE_CLASS, labelTone, revealDelayClass } from "./primitives";

describe("chip tones", () => {
  it("gives every tone its own non-empty class", () => {
    const classes = CHIP_TONES.map((t) => CHIP_TONE_CLASS[t]);
    for (const c of classes) expect(c.length).toBeGreaterThan(0);
    expect(new Set(classes).size).toBe(CHIP_TONES.length);
  });

  it("maps every context label to the tone DESIGN.md names", () => {
    expect(labelTone("stuck")).toBe("amber");
    expect(labelTone("building")).toBe("accent");
    expect(labelTone("learning")).toBe("green");
    expect(labelTone("looking_for_team")).toBe("coral");
    for (const l of CONTEXT_LABELS) expect(CHIP_TONES).toContain(labelTone(l));
  });
});

describe("revealDelayClass", () => {
  it("is empty at 0 and exact on 40ms steps", () => {
    expect(revealDelayClass(0)).toBe("");
    expect(revealDelayClass(80)).toBe("[animation-delay:80ms]");
    expect(revealDelayClass(480)).toBe("[animation-delay:480ms]");
  });

  it("rounds to the nearest 40ms step", () => {
    expect(revealDelayClass(140)).toBe("[animation-delay:160ms]");
    expect(revealDelayClass(60)).toBe("[animation-delay:80ms]");
    expect(revealDelayClass(19)).toBe("");
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(revealDelayClass(-100)).toBe("");
    expect(revealDelayClass(5000)).toBe("[animation-delay:480ms]");
    expect(revealDelayClass(Number.NaN)).toBe("");
  });
});
