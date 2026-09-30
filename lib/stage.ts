export const STAGES = ["learning", "building", "internship_search", "interning", "job_search", "working"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  learning: "Learning the basics",
  building: "Building projects",
  internship_search: "Hunting internships",
  interning: "Interning",
  job_search: "Job hunting",
  working: "Working in tech",
};

export const FOCUS_AREAS = [
  "web", "mobile", "ai_ml", "data", "systems", "security", "cloud", "games", "hardware", "robotics",
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const FOCUS_LABELS: Record<FocusArea, string> = {
  web: "Web",
  mobile: "Mobile",
  ai_ml: "AI/ML",
  data: "Data",
  systems: "Systems",
  security: "Security",
  cloud: "Cloud/DevOps",
  games: "Games",
  hardware: "Hardware",
  robotics: "Robotics",
};

export const MAX_FOCUS_AREAS = 3;

export function parseStage(raw: unknown): Stage | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return (STAGES as readonly string[]).includes(s) ? (s as Stage) : null;
}

/** Empty is fine (no stage). Non-empty junk is an error. */
export function stageError(raw: unknown): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  return parseStage(raw) ? null : "Pick a stage from the list.";
}

export type FocusParse = { ok: true; data: FocusArea[] } | { ok: false; error: string };

/** Dedupes and returns values in FOCUS_AREAS order, so stored arrays compare with join(","). */
export function parseFocusAreas(values: unknown): FocusParse {
  const raw = Array.isArray(values) ? values : [];
  const picked = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string" || !(FOCUS_AREAS as readonly string[]).includes(v)) {
      return { ok: false, error: "Pick focus areas from the list." };
    }
    picked.add(v);
  }
  if (picked.size > MAX_FOCUS_AREAS) return { ok: false, error: `Pick up to ${MAX_FOCUS_AREAS} focus areas.` };
  return { ok: true, data: FOCUS_AREAS.filter((f) => picked.has(f)) };
}

/** A stage change worth a post: from a real previous stage to a different one. */
export type StageMoment = { from: Stage; to: Stage };

export const STAGE_MOMENT_COOKIE = "sh_stage_moment";

/** Null for a first stage (null before), no change, or junk. */
export function stageMomentFrom(prev: unknown, next: unknown): StageMoment | null {
  const from = parseStage(prev);
  const to = parseStage(next);
  if (!from || !to || from === to) return null;
  return { from, to };
}

export function encodeStageMoment(m: StageMoment): string {
  return `${m.from}.${m.to}`;
}

/** Cookie values are client-controlled: validate every part. */
export function parseStageMoment(raw: unknown): StageMoment | null {
  if (typeof raw !== "string") return null;
  const [from, to, extra] = raw.split(".");
  if (extra !== undefined) return null;
  return stageMomentFrom(from, to);
}

/** Prefilled composer draft. The student edits or discards it; nothing posts on its own. */
export function stageMomentDraft(m: StageMoment): { content: string; label: "building" | null } {
  return {
    content: `Moved from ${STAGE_LABELS[m.from]} to ${STAGE_LABELS[m.to]}. `,
    label: m.to === "building" ? "building" : null,
  };
}
