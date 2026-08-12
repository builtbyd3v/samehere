import { describe, it, expect } from "vitest";
import {
  formatInterviewFeedback,
  heuristicInterviewFeedback,
  parseInterviewFeedbackJson,
} from "./interview-feedback";
import type { InterviewQuestion } from "./types";

const question: InterviewQuestion = {
  id: "google-coding-1",
  type: "coding",
  difficulty: "intermediate",
  prompt: "Given meeting intervals, return the minimum number of rooms.",
  approach:
    "Sort starts and ends separately. Sweep chronologically and narrate invariants as you code.",
  evaluating:
    "Correct interval handling, clean complexity analysis, and overlapping nested back-to-back cases.",
};

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

describe("heuristicInterviewFeedback", () => {
  const longAligned =
    "I would sort the starts and ends separately, then sweep chronologically. A new room is needed when a meeting starts before the earliest end frees. I would check overlapping, nested, and back-to-back interval cases and state time and space complexity.";

  it("scores a short answer lower than a longer rubric-aligned answer", () => {
    const short = heuristicInterviewFeedback({ answer: "ok", question });
    const long = heuristicInterviewFeedback({ answer: longAligned, question });
    expect(short.score).toBeLessThan(long.score);
  });

  it("always returns strengths, gaps, rewrite_hint, and a 1–5 score", () => {
    for (const answer of ["x", "ok", longAligned, " ".repeat(20) + "hmm"]) {
      const fb = heuristicInterviewFeedback({ answer, question });
      expect(fb.strengths.length).toBeGreaterThan(0);
      expect(fb.gaps.length).toBeGreaterThan(0);
      expect(fb.rewrite_hint.length).toBeGreaterThan(0);
      expect(fb.score).toBeGreaterThanOrEqual(1);
      expect(fb.score).toBeLessThanOrEqual(5);
    }
  });

  it("grounds gaps and rewrite_hint in evaluating / approach", () => {
    const fb = heuristicInterviewFeedback({ answer: "ok", question });
    expect(fb.gaps[0]?.toLowerCase()).toMatch(/interval|complexity|overlapping/);
    expect(fb.rewrite_hint.toLowerCase()).toMatch(/sort|sweep|chronologically/);
    expect(fb.rewrite_hint).toContain("Local rubric");
  });
});
