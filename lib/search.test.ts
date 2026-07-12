import { describe, it, expect } from "vitest";
import { tokensFor } from "./search";
import { TEXT_LIMITS } from "./utils/validation";

describe("tokensFor", () => {
  it("lowercases and splits a plain multi-word query", () => {
    expect(tokensFor("computer science")).toEqual(["computer", "science"]);
  });

  it("strips PostgREST-dangerous chars and quotes", () => {
    expect(tokensFor("a,b(c)*%")).toEqual(["abc"]);
    expect(tokensFor("username.ilike.%x%")).toEqual(["usernameilikex"]);
    expect(tokensFor(`a"b'c`)).toEqual(["abc"]);
  });

  it("returns [] for empty or whitespace-only input", () => {
    expect(tokensFor("")).toEqual([]);
    expect(tokensFor("   ")).toEqual([]);
  });

  it("caps token count at 8", () => {
    const tokens = tokensFor("one two three four five six seven eight nine ten");
    expect(tokens.length).toBe(8);
  });

  it("slices input longer than TEXT_LIMITS.searchQuery before tokenizing", () => {
    const long = "a".repeat(TEXT_LIMITS.searchQuery + 50);
    const tokens = tokensFor(long);
    expect(tokens.length).toBe(1);
    expect(tokens[0].length).toBeLessThanOrEqual(TEXT_LIMITS.searchQuery);
  });

  it("every returned token is [a-z0-9]+ only", () => {
    const tokens = tokensFor(`weird,()*%\\input"with'punct.tuation`);
    for (const t of tokens) {
      expect(t).toMatch(/^[a-z0-9]+$/);
    }
  });
});
