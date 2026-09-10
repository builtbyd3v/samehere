import { describe, expect, it } from "vitest";
import { useAnonPortfolioReads } from "./anon-policy";

describe("useAnonPortfolioReads", () => {
  it("uses anon only for a real anonymous viewer", () => {
    expect(useAnonPortfolioReads(false)).toBe(true);
    expect(useAnonPortfolioReads(true)).toBe(false);
  });

  it("keeps a signed-in viewer on the session client so block context survives", () => {
    expect(useAnonPortfolioReads(true, false)).toBe(false);
  });

  it("allows owner public preview to opt into anon", () => {
    expect(useAnonPortfolioReads(true, true)).toBe(true);
  });
});
