import type { PathProject } from "./types";

export const PROJECT_EXPERIENCE_KIND = "project" as const;

export type DossierExperienceDraft = {
  kind: typeof PROJECT_EXPERIENCE_KIND;
  org: string;
  role: string;
  note: string;
  bullets: string[];
};

const NOTE_MAX = 600;
const FIELD_MAX = 80;

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/** Join lines into an experiences.note payload without exceeding the DB cap. */
export function joinExperienceNote(lines: string[], max = NOTE_MAX): string {
  const out: string[] = [];
  let len = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const next = line.slice(0, max);
    const add = out.length ? 1 + next.length : next.length;
    if (len + add > max) break;
    out.push(next);
    len += add;
  }
  return out.join("\n");
}

/** Deterministic dossier row from a native path project. No AI. */
export function draftDossierFromProject(
  project: Pick<PathProject, "title" | "domain" | "what_you_build" | "interview_roi">,
): DossierExperienceDraft {
  const role = clip(project.title, FIELD_MAX);
  const org = clip(project.domain, FIELD_MAX) || "Personal project";
  const note = joinExperienceNote([...project.what_you_build, project.interview_roi]);
  return {
    kind: PROJECT_EXPERIENCE_KIND,
    org,
    role,
    note,
    bullets: note.split("\n").filter(Boolean),
  };
}

export function matchesProjectExperience(
  exp: { kind: string; role: string },
  projectTitle: string,
): boolean {
  return exp.kind === PROJECT_EXPERIENCE_KIND && exp.role === clip(projectTitle, FIELD_MAX);
}
