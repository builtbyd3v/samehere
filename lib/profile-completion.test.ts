import { describe, expect, it } from "vitest";
import { fallbackProfileNudge, getProfileGaps } from "./profile-completion";

describe("getProfileGaps", () => {
  it("asks for the recruiter-facing fields in order", () => {
    expect(
      getProfileGaps({
        display_name: null,
        avatar_url: null,
        school: "",
        year: null,
        major: null,
        bio: "short",
        goals: "role",
      }),
    ).toEqual(["avatar", "display_name", "school", "major", "bio", "goals"]);
  });
});

describe("fallbackProfileNudge", () => {
  it("points at the target role, not the feed", () => {
    const text = fallbackProfileNudge(["goals"]);
    expect(text.toLowerCase()).toContain("role");
    expect(text.toLowerCase()).not.toMatch(/follow|feed|classmates/);
  });

  it("does not tell a complete dossier to keep posting", () => {
    const text = fallbackProfileNudge([]);
    expect(text.toLowerCase()).not.toMatch(/posting|feed|peers/);
  });
});
