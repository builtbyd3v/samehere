export type MatchSignal = {
  year: string | null;
  major: string | null;
  skills: string[] | null;
  goals: string | null;
  bio: string | null;
  school: string | null;
  // optional: callers that don't select courses yet stay backward-compatible.
  courses?: string[] | null;
};

function norm(s: string | null): string {
  return s?.trim().toLowerCase() ?? "";
}

function words(s: string | null): Set<string> {
  return new Set(
    norm(s)
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );
}

// Weighted overlap. Higher = better fit. All comparisons case-insensitive.
// school +3, major +2, year +1, each shared course +1.5 (classmate = strongest
// concrete signal), each shared skill +1, each shared bio/goals keyword
// (len>3, deduped) +0.5. // ponytail: fixed weights, no tuning knobs; revisit
// only once real engagement data exists (v1.5 refinement).
export function scoreOverlap(viewer: MatchSignal, candidate: MatchSignal): number {
  let score = 0;

  const school = norm(viewer.school);
  if (school && school === norm(candidate.school)) score += 3;

  const major = norm(viewer.major);
  if (major && major === norm(candidate.major)) score += 2;

  const year = norm(viewer.year);
  if (year && year === norm(candidate.year)) score += 1;

  const viewerCourses = new Set((viewer.courses ?? []).map((c) => norm(c)).filter(Boolean));
  const candidateCourses = new Set((candidate.courses ?? []).map((c) => norm(c)).filter(Boolean));
  for (const c of viewerCourses) {
    if (candidateCourses.has(c)) score += 1.5;
  }

  const viewerSkills = new Set((viewer.skills ?? []).map((s) => norm(s)).filter(Boolean));
  const candidateSkills = new Set((candidate.skills ?? []).map((s) => norm(s)).filter(Boolean));
  for (const s of viewerSkills) {
    if (candidateSkills.has(s)) score += 1;
  }

  // sanity: identical profiles share every word/skill -> max score; disjoint profiles -> 0.
  const viewerWords = new Set([...words(viewer.bio), ...words(viewer.goals)]);
  const candidateWords = new Set([...words(candidate.bio), ...words(candidate.goals)]);
  for (const w of viewerWords) {
    if (candidateWords.has(w)) score += 0.5;
  }

  return score;
}
