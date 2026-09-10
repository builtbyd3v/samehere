import { describe, expect, it } from "vitest";
import { reactionAfterSelect } from "./scene-control";

describe("reactionAfterSelect", () => {
  it("keeps an autoplay reaction when selecting a person", () => {
    expect(reactionAfterSelect(false, false, true)).toBe(true);
  });

  it("does not invent a reaction before autoplay or a toggle", () => {
    expect(reactionAfterSelect(false, false, false)).toBe(false);
  });

  it("preserves a user toggle after control is taken", () => {
    expect(reactionAfterSelect(true, true, true)).toBe(true);
    expect(reactionAfterSelect(true, false, true)).toBe(false);
  });
});
