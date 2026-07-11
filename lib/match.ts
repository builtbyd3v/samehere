export type MatchSignal = {
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
  school: string | null;
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
// school +1, major +2, year +1, each shared bio/goals keyword (len>3, deduped)
// +0.5. // ponytail: skills/courses signals removed (columns dropped); matcher
// now leans on school/major/year/keywords only. Fixed weights, no tuning
// knobs; revisit once real engagement data exists (v1.5 refinement).
// school flattened 3→1 for the cross-school beta cohort (plan 010); revisit at v1.5 with engagement data.
export function scoreOverlap(viewer: MatchSignal, candidate: MatchSignal): number {
  let score = 0;

  const school = norm(viewer.school);
  if (school && school === norm(candidate.school)) score += 1;

  const major = norm(viewer.major);
  if (major && major === norm(candidate.major)) score += 2;

  const year = norm(viewer.year);
  if (year && year === norm(candidate.year)) score += 1;

  // sanity: identical profiles share every word -> max score; disjoint profiles -> 0.
  const viewerWords = new Set([...words(viewer.bio), ...words(viewer.goals)]);
  const candidateWords = new Set([...words(candidate.bio), ...words(candidate.goals)]);
  for (const w of viewerWords) {
    if (candidateWords.has(w)) score += 0.5;
  }

  return score;
}
