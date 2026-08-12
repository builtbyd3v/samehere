export const EXPERIENCE_KIND_LABELS = {
  internship: "Internship",
  job: "Job",
  research: "Research",
  project: "Project",
  club_role: "Club role",
} as const;

export type ExperienceKind = keyof typeof EXPERIENCE_KIND_LABELS;

export const EXPERIENCE_GROUP_ORDER: { kind: ExperienceKind; label: string }[] = [
  { kind: "internship", label: "Internships" },
  { kind: "job", label: "Jobs" },
  { kind: "research", label: "Research" },
  { kind: "project", label: "Projects" },
  { kind: "club_role", label: "Leadership & clubs" },
];

export const HELP_EXPERIENCE_KINDS = new Set<string>(["internship", "job", "research"]);

const PROOF_KINDS = new Set<string>(["internship", "job", "research"]);

export function isExperienceKind(value: string): value is ExperienceKind {
  return Object.prototype.hasOwnProperty.call(EXPERIENCE_KIND_LABELS, value);
}

export function experienceKindLabel(kind: string): string {
  return isExperienceKind(kind) ? EXPERIENCE_KIND_LABELS[kind] : kind;
}

export type GroupableExperience = {
  kind: string;
  start_date: string | null;
};

export function groupExperiences<T extends GroupableExperience>(
  rows: T[],
): { kind: string; label: string; items: T[] }[] {
  const newestFirst = (a: T, b: T) => (b.start_date ?? "").localeCompare(a.start_date ?? "");
  const groups: { kind: string; label: string; items: T[] }[] = EXPERIENCE_GROUP_ORDER.map((group) => ({
    kind: group.kind,
    label: group.label,
    items: rows.filter((row) => row.kind === group.kind).sort(newestFirst),
  })).filter((group) => group.items.length > 0);

  const known = new Set<string>(EXPERIENCE_GROUP_ORDER.map((group) => group.kind));
  const other = rows.filter((row) => !known.has(row.kind)).sort(newestFirst);
  if (other.length > 0) {
    groups.push({ kind: "other", label: "Other", items: other });
  }
  return groups;
}

function stringList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 80))
    .slice(0, max);
}

/** Read target_roles from intake JSON without requiring a full intake parse. */
export function targetRolesFromAnswers(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return stringList((raw as { target_roles?: unknown }).target_roles);
}

export function dossierSeekingLine(input: {
  targetRoles?: readonly string[] | null;
  goals?: string | null;
  currentKind?: string | null;
  currentRole?: string | null;
  currentOrg?: string | null;
  major?: string | null;
}): string | null {
  const roles = (input.targetRoles ?? []).map((role) => role.trim()).filter(Boolean);
  if (roles.length > 0) return roles.slice(0, 2).join(", ");

  const goalLine = input.goals
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (goalLine) return goalLine.slice(0, 160);

  if (input.currentRole && PROOF_KINDS.has(input.currentKind ?? "")) {
    const role = input.currentRole.trim();
    const org = input.currentOrg?.trim();
    if (role && org) return `${role} at ${org}`;
    if (role) return role;
  }

  const major = input.major?.trim();
  return major || null;
}
