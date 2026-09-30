export const SKILLS_CAP = 12;

/**
 * Skills for a resume view, derived from PUBLISHED projects only (caller
 * passes published projects). Case-insensitive dedupe keeps the first-seen
 * spelling. Order: number of projects using it (desc), then first appearance.
 * A technology repeated inside one project counts once for that project.
 */
export function deriveSkills(
  projects: ReadonlyArray<{ technologies: readonly string[] }>,
  cap: number = SKILLS_CAP
): string[] {
  const seen = new Map<string, { label: string; count: number; first: number }>();
  let order = 0;
  for (const project of projects) {
    const inProject = new Set<string>();
    for (const raw of project.technologies) {
      const label = raw.trim();
      const key = label.toLowerCase();
      if (!label || inProject.has(key)) continue;
      inProject.add(key);
      const hit = seen.get(key);
      if (hit) hit.count += 1;
      else seen.set(key, { label, count: 1, first: order++ });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .slice(0, cap)
    .map((skill) => skill.label);
}
