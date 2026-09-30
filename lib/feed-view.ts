import { STAGE_LABELS, parseStage } from "@/lib/stage";

/** A Stuck post reads as a question: first line is the question, the rest is detail. */
export function splitQuestion(content: string): { question: string; detail: string | null } {
  const text = content.trim();
  const nl = text.indexOf("\n");
  if (nl === -1) return { question: text, detail: null };
  const detail = text.slice(nl + 1).trim();
  return { question: text.slice(0, nl).trim(), detail: detail || null };
}

type MetaAuthor = {
  is_private: boolean;
  stage: string | null;
  profile_school: { school: string | null } | null;
} | null;

/** Meta next to the author name: their stage (public profiles only), else their school. */
export function authorMetaLine(author: MetaAuthor): string | null {
  if (!author) return null;
  const stage = author.is_private ? null : parseStage(author.stage);
  if (stage) return STAGE_LABELS[stage];
  return author.profile_school?.school ?? null;
}

type ReasonViewer = { stage: string | null; school: string | null };
type ReasonPerson = { stage: string | null; school: string | null; year: string | null; major: string | null };

/**
 * Why a suggested person is shown. Only claims what both rows really share
 * (stage, school). Falls back to the person's own year/major, never invents.
 */
export function suggestionReason(viewer: ReasonViewer, person: ReasonPerson): string | null {
  const parts: string[] = [];
  const stage = parseStage(person.stage);
  if (stage && stage === parseStage(viewer.stage)) {
    const label = STAGE_LABELS[stage];
    parts.push(`Also ${label.charAt(0).toLowerCase()}${label.slice(1)}`);
  }
  if (person.school && viewer.school && person.school === viewer.school) {
    parts.push(parts.length ? "same school" : "Same school");
  }
  if (parts.length) return parts.join(" · ");
  if (person.year && person.major) return `${person.year} · ${person.major}`;
  return person.year ?? person.major ?? null;
}
