import type {
  AnalysisDraft,
  ContextLabel,
  OpenToTag,
  StudyMode,
  PortfolioPublishFlags,
  PortfolioSection,
  ProjectStatus,
  ProjectWriteInput,
} from "@/types/portfolio";

export const PORTFOLIO_LIMITS = {
  title: 100,
  summary: 500,
  description: 4000,
  personalRole: 1000,
  technologies: 12,
  keyFeatures: 6,
  tag: 40,
  feature: 160,
  uncertaintyNote: 280,
  evidencePath: 260,
  evidenceExcerpt: 500,
  url: 2048,
} as const;

export const CONTEXT_LABELS = ["building", "learning", "stuck"] as const satisfies readonly ContextLabel[];
export const OPEN_TO_TAGS = ["collaborate", "study", "feedback"] as const satisfies readonly OpenToTag[];
export const STUDY_MODES = [
  "on_campus",
  "online",
  "hybrid",
  "bootcamp",
  "self_taught",
] as const satisfies readonly StudyMode[];
export const PORTFOLIO_SECTIONS = [
  "intro",
  "projects",
  "activity",
  "experience",
  "education",
  "posts",
] as const satisfies readonly PortfolioSection[];

function capped(label: string, max: number): string {
  return `${label} is capped at ${max} characters.`;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function textCapError(label: string, value: string | null, max: number): string | null {
  if (value !== null && value.length > max) return capped(label, max);
  return null;
}

function arrayItemsError(
  label: string,
  items: string[],
  maxItems: number,
  maxItemLength: number
): string | null {
  if (items.length > maxItems) return `At most ${maxItems} ${label}.`;
  for (const item of items) {
    const trimmed = item.trim();
    if (trimmed.length === 0) return `${label} cannot include a blank entry.`;
    if (trimmed.length > maxItemLength) return capped(label.replace(/\.$/, ""), maxItemLength);
  }
  return null;
}

export function httpUrlError(label: string, url: string | null | undefined): string | null {
  const normalized = normalizeOptional(url);
  if (normalized === null) return null;
  if (normalized.length > PORTFOLIO_LIMITS.url) {
    return `${label} must be an http or https URL.`;
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return `${label} must be an http or https URL.`;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${label} must be an http or https URL.`;
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return `${label} must not include userinfo.`;
  }
  if (parsed.hostname === "") {
    return `${label} must be an http or https URL.`;
  }
  return null;
}

export function contextLabelError(label: string | null | undefined): string | null {
  const normalized = normalizeOptional(label);
  if (normalized === null) return null;
  if ((CONTEXT_LABELS as readonly string[]).includes(normalized)) return null;
  return "Context label must be building, learning, or stuck.";
}

export function studyModeError(mode: string | null | undefined): string | null {
  const normalized = normalizeOptional(mode);
  if (normalized === null) return null;
  if ((STUDY_MODES as readonly string[]).includes(normalized)) return null;
  return "Study mode must be on campus, online, hybrid, bootcamp, or self-taught.";
}

export function openToError(tags: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!(OPEN_TO_TAGS as readonly string[]).includes(tag)) {
      return "Open-to tags must be collaborate, study, or feedback.";
    }
    if (seen.has(tag)) return "Open-to tags must be unique.";
    seen.add(tag);
  }
  return null;
}

export function sectionOrderError(order: readonly string[]): string | null {
  if (order.length !== PORTFOLIO_SECTIONS.length) {
    return "Section order must list each portfolio section once.";
  }
  const seen = new Set<string>();
  for (const section of order) {
    if (!(PORTFOLIO_SECTIONS as readonly string[]).includes(section) || seen.has(section)) {
      return "Section order must list each portfolio section once.";
    }
    seen.add(section);
  }
  return null;
}

export function projectWriteError(input: ProjectWriteInput): string | null {
  const title = input.title.trim();
  if (title.length === 0) return "Title is required.";
  const titleError = textCapError("Title", title, PORTFOLIO_LIMITS.title);
  if (titleError) return titleError;

  const summary = normalizeOptional(input.summary);
  const description = normalizeOptional(input.description);
  const personalRole = normalizeOptional(input.personalRole);
  const summaryError = textCapError("Summary", summary, PORTFOLIO_LIMITS.summary);
  if (summaryError) return summaryError;
  const descriptionError = textCapError("Description", description, PORTFOLIO_LIMITS.description);
  if (descriptionError) return descriptionError;
  const roleError = textCapError("Personal role", personalRole, PORTFOLIO_LIMITS.personalRole);
  if (roleError) return roleError;

  const status: ProjectStatus = input.status;
  if (status === "published" && personalRole === null) {
    return "Published project requires a personal role.";
  }

  const techError = arrayItemsError(
    "technology tags",
    input.technologies,
    PORTFOLIO_LIMITS.technologies,
    PORTFOLIO_LIMITS.tag
  );
  if (techError) return techError;

  const featureError = arrayItemsError(
    "key features",
    input.keyFeatures,
    PORTFOLIO_LIMITS.keyFeatures,
    PORTFOLIO_LIMITS.feature
  );
  if (featureError) return featureError;

  const repoError = httpUrlError("Repo", input.repoUrl);
  if (repoError) return repoError;
  return httpUrlError("Demo", input.demoUrl);
}

export function parseAnalysisDraft(
  value: unknown
): { ok: true; value: AnalysisDraft } | { ok: false; error: string } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Analysis draft is required." };
  }
  const raw = value as Record<string, unknown>;
  const technologies = asStringArray(raw.technologies);
  const keyFeatures = asStringArray(raw.keyFeatures);
  const uncertaintyNotes = asStringArray(raw.uncertaintyNotes);
  const evidence = asEvidence(raw.evidence);
  if (!technologies || !keyFeatures || !uncertaintyNotes || !evidence) {
    return { ok: false, error: "Analysis draft shape is invalid." };
  }
  const draft: AnalysisDraft = {
    title: asString(raw.title) ?? "",
    summary: asString(raw.summary) ?? "",
    description: asString(raw.description) ?? "",
    technologies,
    keyFeatures,
    uncertaintyNotes,
    evidence,
  };
  if (draft.title.trim().length === 0) {
    return { ok: false, error: "Title is required." };
  }
  if (draft.title.length > PORTFOLIO_LIMITS.title) {
    return { ok: false, error: capped("Title", PORTFOLIO_LIMITS.title) };
  }
  const error = projectWriteError({
    title: draft.title,
    summary: draft.summary,
    description: draft.description,
    personalRole: null,
    technologies: draft.technologies,
    keyFeatures: draft.keyFeatures,
    repoUrl: null,
    demoUrl: null,
    status: "draft",
  });
  if (error) return { ok: false, error }
  const notesError = arrayItemsError(
    "uncertainty notes",
    draft.uncertaintyNotes,
    PORTFOLIO_LIMITS.keyFeatures,
    PORTFOLIO_LIMITS.uncertaintyNote
  );
  if (notesError) return { ok: false, error: notesError };
  for (const item of draft.evidence) {
    if (item.path.length > PORTFOLIO_LIMITS.evidencePath) {
      return { ok: false, error: capped("Evidence path", PORTFOLIO_LIMITS.evidencePath) };
    }
    if (item.excerpt !== undefined && item.excerpt.length > PORTFOLIO_LIMITS.evidenceExcerpt) {
      return { ok: false, error: capped("Evidence excerpt", PORTFOLIO_LIMITS.evidenceExcerpt) };
    }
  }
  return { ok: true, value: draft };
}

export function portfolioPublishConflict(
  isPrivate: boolean,
  flags: PortfolioPublishFlags
): boolean {
  if (!isPrivate) return false;
  return (
    flags.publish_intro ||
    flags.publish_projects ||
    flags.publish_activity ||
    flags.publish_experience ||
    flags.publish_education ||
    flags.publish_posts ||
    flags.allow_indexing
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value;
}

function asEvidence(value: unknown): AnalysisDraft["evidence"] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const items: AnalysisDraft["evidence"] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return null;
    const path = asString((item as { path?: unknown }).path);
    if (path === null || path.trim().length === 0) return null;
    const excerptRaw = (item as { excerpt?: unknown }).excerpt;
    if (excerptRaw === undefined) {
      items.push({ path: path.trim() });
      continue;
    }
    if (typeof excerptRaw !== "string") return null;
    items.push({ path: path.trim(), excerpt: excerptRaw });
  }
  return items;
}
