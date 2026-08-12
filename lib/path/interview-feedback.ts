import type { InterviewQuestion } from "./types";

export type InterviewFeedbackJson = {
  score: number;
  strengths: string[];
  gaps: string[];
  rewrite_hint: string;
};

// Length >= 4 already drops a/an/to/of; this only strips leftover glue words.
const STOP = new Set([
  "about", "also", "been", "could", "does", "from", "have", "into", "more",
  "most", "should", "than", "that", "their", "them", "then", "they", "this",
  "were", "what", "when", "will", "with", "would", "your",
]);

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w.length >= 4 && !STOP.has(w),
  );
}

function overlapHits(answer: string, source: string): string[] {
  const sourceSet = new Set(tokens(source));
  const seen = new Set<string>();
  const hits: string[] = [];
  for (const t of tokens(answer)) {
    if (sourceSet.has(t) && !seen.has(t)) {
      seen.add(t);
      hits.push(t);
    }
  }
  return hits;
}

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max).trimEnd();
}

/** Deterministic rubric when AI is off or generateText returns unusable output. */
export function heuristicInterviewFeedback(input: {
  answer: string;
  question: InterviewQuestion;
}): InterviewFeedbackJson {
  const answer = input.answer.trim();
  const approach = input.question.approach.trim();
  const evaluating = input.question.evaluating.trim();
  const rubric = `${approach} ${evaluating}`;
  const hits = overlapHits(answer, rubric);
  const len = answer.length;

  // ponytail: length + token overlap vs bank rubric; calibrated scoring if this becomes a product surface
  const lengthPts = len < 80 ? 0 : len < 200 ? 1 : 2;
  const overlapPts = hits.length === 0 ? 0 : hits.length < 3 ? 1 : hits.length < 6 ? 2 : 3;
  const score = Math.min(5, Math.max(1, 1 + lengthPts + overlapPts));

  const strengths =
    hits.length > 0
      ? [`You hit some of the rubric (${hits.slice(0, 4).join(", ")}).`]
      : len >= 80
        ? ["You wrote a full attempt. Map the next draft to what they're evaluating."]
        : ["You started an answer. Expand it against the rubric."];

  const evalBit = clip(evaluating || "the stated rubric", 180);
  const gaps =
    hits.length < 3
      ? [`Cover what they're evaluating: ${evalBit}`]
      : [`Still missing some of: ${evalBit}`];

  const approachBit = clip(approach || "a clearer opening claim and one concrete example", 180);
  const rewrite_hint = clip(`Local rubric: rewrite using this approach. ${approachBit}`, 500);

  return { score, strengths, gaps, rewrite_hint };
}

function cleanJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function stringList(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim().slice(0, 280))
    .slice(0, max);
}

/** Parse model JSON into a feedback blob, or null if unusable. */
export function parseInterviewFeedbackJson(raw: string | null): InterviewFeedbackJson | null {
  if (!raw?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonText(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const strengths = stringList(row.strengths);
  const gaps = stringList(row.gaps);
  const rewrite =
    typeof row.rewrite_hint === "string" ? row.rewrite_hint.trim().slice(0, 500) : "";
  if (!strengths.length && !gaps.length && !rewrite) return null;

  const scoreRaw = row.score;
  const score =
    typeof scoreRaw === "number" && Number.isFinite(scoreRaw)
      ? Math.min(5, Math.max(1, Math.round(scoreRaw)))
      : 3;

  return {
    score,
    strengths: strengths.length ? strengths : ["Solid attempt — keep going."],
    gaps: gaps.length ? gaps : ["Tighten structure against what they're evaluating."],
    rewrite_hint: rewrite || "Rewrite once with a clearer opening claim and one concrete example.",
  };
}

/** Format feedback JSON for plain-text display in the answer box. */
export function formatInterviewFeedback(fb: InterviewFeedbackJson): string {
  const strengths = fb.strengths.map((s) => `• ${s}`).join("\n");
  const gaps = fb.gaps.map((s) => `• ${s}`).join("\n");
  return [
    `Score: ${fb.score}/5`,
    "",
    "Strengths",
    strengths,
    "",
    "Gaps",
    gaps,
    "",
    "Rewrite hint",
    fb.rewrite_hint,
  ].join("\n");
}
