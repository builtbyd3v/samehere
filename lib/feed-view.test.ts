import { describe, it, expect } from "vitest";
import { authorMetaLine, splitQuestion, suggestionReason } from "./feed-view";
import { POST_SELECT, POST_SELECT_AUTHOR_INNER } from "@/components/feed/PostCard";

describe("splitQuestion", () => {
  it("uses the first line as the question", () => {
    expect(splitQuestion("How do I X?")).toEqual({ question: "How do I X?", detail: null });
    expect(splitQuestion("Q?\nMore context")).toEqual({ question: "Q?", detail: "More context" });
    expect(splitQuestion("Q?\n\n  D  ")).toEqual({ question: "Q?", detail: "D" });
    expect(splitQuestion("  Q?\n")).toEqual({ question: "Q?", detail: null });
    expect(splitQuestion("Q?\nline 2\nline 3")).toEqual({ question: "Q?", detail: "line 2\nline 3" });
  });
});

describe("authorMetaLine", () => {
  const pub = { is_private: false, stage: "internship_search", profile_school: { school: "State U" } };

  it("shows a public author's stage", () => {
    expect(authorMetaLine(pub)).toBe("Hunting internships");
  });

  it("falls back to school for private authors, junk stages, or no stage", () => {
    expect(authorMetaLine({ ...pub, is_private: true })).toBe("State U");
    expect(authorMetaLine({ is_private: false, stage: "ninja", profile_school: null })).toBeNull();
    expect(authorMetaLine({ is_private: false, stage: null, profile_school: { school: "State U" } })).toBe("State U");
    expect(authorMetaLine(null)).toBeNull();
  });
});

describe("suggestionReason", () => {
  const viewer = { stage: "building", school: "State U" };
  const none = { stage: null, school: null, year: null, major: null };

  it("claims only what both share", () => {
    expect(suggestionReason(viewer, { ...none, stage: "building" })).toBe("Also building projects");
    expect(suggestionReason(viewer, { ...none, stage: "building", school: "State U" })).toBe(
      "Also building projects · same school",
    );
    expect(suggestionReason(viewer, { ...none, school: "State U" })).toBe("Same school");
  });

  it("never says Also without both stages", () => {
    expect(
      suggestionReason({ stage: null, school: null }, { stage: "building", school: null, year: "Sophomore", major: "CS" }),
    ).toBe("Sophomore · CS");
    expect(suggestionReason(viewer, { ...none, year: "Sophomore", major: "CS" })).toBe("Sophomore · CS");
  });

  it("returns null or the year when nothing is shared", () => {
    expect(suggestionReason(viewer, none)).toBeNull();
    expect(suggestionReason(viewer, { ...none, year: "Junior" })).toBe("Junior");
  });
});

describe("POST_SELECT_AUTHOR_INNER", () => {
  it("differs from POST_SELECT by exactly one !inner on the author embed", () => {
    expect(POST_SELECT_AUTHOR_INNER).not.toBe(POST_SELECT);
    expect(POST_SELECT_AUTHOR_INNER.split("profiles!posts_user_id_fkey!inner(").length - 1).toBe(1);
    expect(POST_SELECT_AUTHOR_INNER.replace("!inner(", "(")).toBe(POST_SELECT);
  });
});
