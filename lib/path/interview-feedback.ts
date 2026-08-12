export type InterviewFeedbackJson = {
  score: number;
  strengths: string[];
  gaps: string[];
  rewrite_hint: string;
};

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
