import { describe, it, expect } from "vitest";
import { usernameError, textLimitError, RESERVED_USERNAMES, TEXT_LIMITS } from "./validation";

describe("usernameError", () => {
  it("accepts valid usernames", () => {
    expect(usernameError("abc")).toBeNull();
    expect(usernameError("a_1")).toBeNull();
    expect(usernameError("a".repeat(20))).toBeNull();
  });

  it("rejects usernames that are too short", () => {
    expect(usernameError("ab")).toBe(
      "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
    );
  });

  it("rejects usernames that are too long", () => {
    expect(usernameError("a".repeat(21))).toBe(
      "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
    );
  });

  it("rejects uppercase letters", () => {
    expect(usernameError("Abc")).toBe(
      "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
    );
  });

  it("rejects hyphens", () => {
    expect(usernameError("a-b")).toBe(
      "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
    );
  });

  it("rejects empty string", () => {
    expect(usernameError("")).toBe(
      "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
    );
  });

  it("rejects every reserved username", () => {
    for (const reserved of RESERVED_USERNAMES) {
      expect(usernameError(reserved)).toBe("That username is reserved.");
    }
  });
});

describe("textLimitError", () => {
  it("returns null at the limit", () => {
    expect(textLimitError("Posts", TEXT_LIMITS.post, TEXT_LIMITS.post)).toBeNull();
  });

  it("returns the capped message one character over", () => {
    const result = textLimitError("Posts", TEXT_LIMITS.post, TEXT_LIMITS.post + 1);
    expect(result).toBe(`Posts are capped at ${TEXT_LIMITS.post} characters.`);
  });
});
