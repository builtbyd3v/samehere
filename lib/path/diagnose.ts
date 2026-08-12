import { fixtureForRecipe } from "./fixtures";
import { resolveUiRecipe } from "./recipe-fallback";
import type {
  ModuleId,
  PathPlanUi,
  PathStage,
  RecipeFallbackInput,
  UiRecipe,
} from "./types";

export type PathTimeline = "this_cycle" | "next_cycle" | "exploring";

export type IntakeAnswers = {
  stage: PathStage;
  constraints: string[];
  target_roles: string[];
  target_companies: string[];
  timeline: PathTimeline;
  blocker: string;
  resume_or_projects?: string;
};

export type DiagnosisBlob = {
  strengths: string[];
  gaps: string[];
  blockers: string[];
  confidence?: number;
  segment_tags?: string[];
};

export type DiagnosisTask = {
  module_id: ModuleId;
  title: string;
  detail?: string;
};

export type DiagnosisResult = {
  ui: PathPlanUi;
  diagnosis: DiagnosisBlob;
  tasks: DiagnosisTask[];
  skill_track_id?: string;
  skill_stage_id?: string;
  project_slug?: string;
};

const STAGES = new Set<PathStage>([
  "no_experience",
  "building",
  "applying",
  "interviewing",
  "offers",
]);

const TIMELINES = new Set<PathTimeline>([
  "this_cycle",
  "next_cycle",
  "exploring",
]);

const MODULE_IDS = new Set<ModuleId>([
  "dossier",
  "opportunities",
  "applications",
  "pitch",
  "project_plan",
  "interview_prep",
  "helpers",
  "skill_stages",
]);

const TONES = new Set<PathPlanUi["tone"]>(["steady", "urgent", "encouraging"]);

export function isPathStage(value: unknown): value is PathStage {
  return typeof value === "string" && STAGES.has(value as PathStage);
}

export function isPathTimeline(value: unknown): value is PathTimeline {
  return typeof value === "string" && TIMELINES.has(value as PathTimeline);
}

function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && MODULE_IDS.has(value as ModuleId);
}

function stringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 200))
    .slice(0, max);
}

function cleanJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function toneForTimeline(timeline: PathTimeline): PathPlanUi["tone"] {
  if (timeline === "this_cycle") return "urgent";
  if (timeline === "exploring") return "encouraging";
  return "steady";
}

function defaultTasks(recipe: UiRecipe, intake: IntakeAnswers): DiagnosisTask[] {
  const blocker = intake.blocker.trim().slice(0, 120);
  switch (recipe) {
    case "studio":
      return [
        {
          module_id: "project_plan",
          title: "Start this week's project",
          detail: blocker ? `Address: ${blocker}` : "Ship one piece of proof you can defend.",
        },
        { module_id: "dossier", title: "Add the project to your dossier when it ships" },
      ];
    case "prep_room":
      return [
        {
          module_id: "interview_prep",
          title: "Practice one real interview question",
          detail: blocker || undefined,
        },
        { module_id: "applications", title: "Update the application that has an interview" },
      ];
    case "focus_track":
      return [
        {
          module_id: "project_plan",
          title: "Do one next move, then stop",
          detail: blocker || "Shrink the surface until you feel unstuck.",
        },
      ];
    case "network_gap":
      return [
        { module_id: "helpers", title: "Ask one helper at a target company" },
        { module_id: "opportunities", title: "Save two listings at those orgs" },
      ];
    case "ops_desk":
    default:
      return [
        { module_id: "opportunities", title: "Pick the strongest listing fit" },
        {
          module_id: "applications",
          title: "Move one application forward today",
          detail: blocker || undefined,
        },
      ];
  }
}

function defaultDiagnosis(intake: IntakeAnswers): DiagnosisBlob {
  const tags = [...intake.constraints];
  return {
    strengths: intake.target_roles.length
      ? [`Clear role aim: ${intake.target_roles.slice(0, 2).join(", ")}`]
      : ["Showed up and named where they are"],
    gaps:
      intake.stage === "no_experience" || intake.stage === "building"
        ? ["Thin proof of shipped work"]
        : intake.stage === "interviewing"
          ? ["Interview reps still thin"]
          : ["Application volume or targeting may lag"],
    blockers: intake.blocker.trim() ? [intake.blocker.trim().slice(0, 200)] : [],
    confidence: 0.45,
    segment_tags: tags,
  };
}

/** Deterministic plan when AI is off or returns unusable JSON. */
export function heuristicDiagnosis(intake: IntakeAnswers): DiagnosisResult {
  const profileStrong = Boolean(
    intake.resume_or_projects?.trim() ||
      (intake.stage !== "no_experience" && intake.stage !== "building"),
  );
  const recipe = resolveUiRecipe(undefined, {
    stage: intake.stage,
    constraints: intake.constraints,
    profileStrong,
  });
  const fixture = fixtureForRecipe(recipe);
  const tone = toneForTimeline(intake.timeline);
  const ui: PathPlanUi = {
    ...fixture,
    tone,
    headline: fixture.headline,
    why: intake.blocker.trim()
      ? `${fixture.why} You named: ${intake.blocker.trim().slice(0, 100)}.`
      : fixture.why,
  };
  return {
    ui,
    diagnosis: defaultDiagnosis(intake),
    tasks: defaultTasks(recipe, intake),
    skill_track_id: "new_grad_swe",
    skill_stage_id:
      intake.stage === "no_experience" || intake.stage === "building"
        ? "foundations"
        : intake.stage === "interviewing" || intake.stage === "offers"
          ? "polish-and-deploy"
          : "apply-early",
    project_slug:
      recipe === "studio" || recipe === "focus_track" ? "url-shortener" : undefined,
  };
}

function parseTasks(raw: unknown): DiagnosisTask[] {
  if (!Array.isArray(raw)) return [];
  const out: DiagnosisTask[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isModuleId(row.module_id)) continue;
    if (typeof row.title !== "string" || !row.title.trim()) continue;
    const task: DiagnosisTask = {
      module_id: row.module_id,
      title: row.title.trim().slice(0, 160),
    };
    if (typeof row.detail === "string" && row.detail.trim()) {
      task.detail = row.detail.trim().slice(0, 400);
    }
    out.push(task);
    if (out.length >= 8) break;
  }
  return out;
}

function parseDiagnosisBlob(raw: unknown, intake: IntakeAnswers): DiagnosisBlob {
  if (!raw || typeof raw !== "object") return defaultDiagnosis(intake);
  const row = raw as Record<string, unknown>;
  const strengths = stringArray(row.strengths);
  const gaps = stringArray(row.gaps);
  const blockers = stringArray(row.blockers);
  const fallback = defaultDiagnosis(intake);
  const blob: DiagnosisBlob = {
    strengths: strengths.length ? strengths : fallback.strengths,
    gaps: gaps.length ? gaps : fallback.gaps,
    blockers: blockers.length ? blockers : fallback.blockers,
  };
  if (typeof row.confidence === "number" && Number.isFinite(row.confidence)) {
    blob.confidence = Math.min(1, Math.max(0, row.confidence));
  }
  const tags = stringArray(row.segment_tags, 16);
  if (tags.length) blob.segment_tags = tags;
  else if (fallback.segment_tags?.length) blob.segment_tags = fallback.segment_tags;
  return blob;
}

/**
 * Parse model JSON into a validated DiagnosisResult.
 * Invalid ui_recipe never persists — resolveUiRecipe applies the heuristic.
 * Unparseable / empty raw → full heuristicDiagnosis.
 */
export function parseDiagnosisJson(
  raw: string | null,
  intake: IntakeAnswers,
): DiagnosisResult {
  const fallback = heuristicDiagnosis(intake);
  if (!raw?.trim()) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonText(raw));
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object") return fallback;

  const row = parsed as Record<string, unknown>;
  const profileStrong = Boolean(
    intake.resume_or_projects?.trim() ||
      (intake.stage !== "no_experience" && intake.stage !== "building"),
  );
  const recipeInput: RecipeFallbackInput = {
    stage: intake.stage,
    constraints: intake.constraints,
    profileStrong,
  };
  const ui_recipe = resolveUiRecipe(row.ui_recipe, recipeInput);
  const fixture = fixtureForRecipe(ui_recipe);

  const module_order = Array.isArray(row.module_order)
    ? row.module_order.filter(isModuleId)
    : [];
  const nav_emphasis = Array.isArray(row.nav_emphasis)
    ? row.nav_emphasis.filter((v): v is string => typeof v === "string").slice(0, 8)
    : fixture.nav_emphasis;

  const tone =
    typeof row.tone === "string" && TONES.has(row.tone as PathPlanUi["tone"])
      ? (row.tone as PathPlanUi["tone"])
      : toneForTimeline(intake.timeline);

  const headline =
    typeof row.headline === "string" && row.headline.trim()
      ? row.headline.trim().slice(0, 120)
      : fixture.headline;
  const why =
    typeof row.why === "string" && row.why.trim()
      ? row.why.trim().slice(0, 280)
      : fixture.why;

  const tasks = parseTasks(row.tasks);
  const result: DiagnosisResult = {
    ui: {
      ui_recipe,
      module_order: module_order.length ? module_order : fixture.module_order,
      nav_emphasis: nav_emphasis.length ? nav_emphasis : fixture.nav_emphasis,
      tone,
      headline,
      why,
    },
    diagnosis: parseDiagnosisBlob(row.diagnosis, intake),
    tasks: tasks.length ? tasks : defaultTasks(ui_recipe, intake),
  };

  if (typeof row.skill_track_id === "string" && row.skill_track_id.trim()) {
    result.skill_track_id = row.skill_track_id.trim().slice(0, 80);
  } else {
    result.skill_track_id = fallback.skill_track_id;
  }
  if (typeof row.skill_stage_id === "string" && row.skill_stage_id.trim()) {
    result.skill_stage_id = row.skill_stage_id.trim().slice(0, 80);
  } else {
    result.skill_stage_id = fallback.skill_stage_id;
  }
  if (typeof row.project_slug === "string" && row.project_slug.trim()) {
    result.project_slug = row.project_slug.trim().slice(0, 80);
  } else if (fallback.project_slug) {
    result.project_slug = fallback.project_slug;
  }

  return result;
}

/** Build the user prompt for INTAKE_DIAGNOSIS_SYSTEM (caller wraps fields with untrusted). */
export function intakeUserPrompt(wrapped: {
  stage: string;
  timeline: string;
  constraints: string;
  target_roles: string;
  target_companies: string;
  blocker: string;
  resume_or_projects: string;
  major?: string;
  year?: string;
  school?: string;
}): string {
  const lines = [
    `stage: ${wrapped.stage}`,
    `timeline: ${wrapped.timeline}`,
    `constraints: ${wrapped.constraints}`,
    `target_roles: ${wrapped.target_roles}`,
    `target_companies: ${wrapped.target_companies}`,
    `blocker: ${wrapped.blocker}`,
    `resume_or_projects: ${wrapped.resume_or_projects}`,
  ];
  if (wrapped.major) lines.push(`major: ${wrapped.major}`);
  if (wrapped.year) lines.push(`year: ${wrapped.year}`);
  if (wrapped.school) lines.push(`school: ${wrapped.school}`);
  return lines.join("\n");
}
