import { describe, it, expect } from "vitest";
import {
  formatInterviewFeedback,
  parseInterviewFeedbackJson,
} from "./interview-feedback";

describe("parseInterviewFeedbackJson", () => {
  it("returns null for empty or junk", () => {
    expect(parseInterviewFeedbackJson(null)).toBeNull();
    expect(parseInterviewFeedbackJson("not json")).toBeNull();
  });

  it("parses fenced JSON and clamps score", () => {
    const raw =
      '```json\n{"score":9,"strengths":["Clear structure"],"gaps":["Missed edge cases"],"rewrite_hint":"Lead with complexity."}\n```';
    const parsed = parseInterviewFeedbackJson(raw);
    expect(parsed).toMatchObject({
      score: 5,
      strengths: ["Clear structure"],
      gaps: ["Missed edge cases"],
      rewrite_hint: "Lead with complexity.",
    });
  });
});

describe("formatInterviewFeedback", () => {
  it("formats strengths, gaps, and rewrite hint", () => {
    const text = formatInterviewFeedback({
      score: 3,
      strengths: ["Named tradeoffs"],
      gaps: ["No example"],
      rewrite_hint: "Add one concrete story.",
    });
    expect(text).toContain("Score: 3/5");
    expect(text).toContain("Strengths");
    expect(text).toContain("• Named tradeoffs");
    expect(text).toContain("Gaps");
    expect(text).toContain("• No example");
    expect(text).toContain("Rewrite hint");
    expect(text).toContain("Add one concrete story.");
  });
});
