import type { DiagnosisResult, DiagnosisTask } from "./diagnose";
import type { ModuleId } from "./types";

export const PATH_FEEDBACK_OUTCOMES = [
  "helped",
  "not_relevant",
  "stuck",
] as const;

export type PathFeedbackOutcome = (typeof PATH_FEEDBACK_OUTCOMES)[number];

const MODULE_IDS = [
  "dossier",
  "opportunities",
  "applications",
  "pitch",
  "project_plan",
  "interview_prep",
  "helpers",
  "skill_stages",
] as const satisfies readonly ModuleId[];

type PathFeedbackMemoryBase = {
  taskId: string;
  moduleId: ModuleId;
  title: string;
  updatedAt: string;
};

export type PathFeedbackMemoryEntry =
  | (PathFeedbackMemoryBase & { outcome: "helped"; note: null })
  | (PathFeedbackMemoryBase & { outcome: "not_relevant"; note: null })
  | (PathFeedbackMemoryBase & { outcome: "stuck"; note: string | null });

export function isPathFeedbackOutcome(
  value: unknown,
): value is PathFeedbackOutcome {
  return (
    typeof value === "string" &&
    PATH_FEEDBACK_OUTCOMES.some((outcome) => outcome === value)
  );
}

function isModuleId(value: unknown): value is ModuleId {
  return (
    typeof value === "string" &&
    MODULE_IDS.some((moduleId) => moduleId === value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

/** Validate a joined feedback/task row at the database boundary. */
export function parsePathFeedbackMemoryEntry(
  value: unknown,
): PathFeedbackMemoryEntry | null {
  if (!isRecord(value) || !isRecord(value.path_tasks)) return null;

  const taskId =
    typeof value.path_task_id === "string"
      ? cleanText(value.path_task_id, 100)
      : "";
  const title =
    typeof value.path_tasks.title === "string"
      ? cleanText(value.path_tasks.title, 160)
      : "";
  const updatedAt =
    typeof value.updated_at === "string" ? value.updated_at.trim() : "";

  if (
    !taskId ||
    !title ||
    !updatedAt ||
    Number.isNaN(Date.parse(updatedAt)) ||
    !isModuleId(value.path_tasks.module_id) ||
    !isPathFeedbackOutcome(value.outcome) ||
    (value.note !== null && typeof value.note !== "string")
  ) {
    return null;
  }

  const base: PathFeedbackMemoryBase = {
    taskId,
    moduleId: value.path_tasks.module_id,
    title,
    updatedAt,
  };
  const note =
    typeof value.note === "string" ? cleanText(value.note, 400) || null : null;

  switch (value.outcome) {
    case "helped":
      return note === null ? { ...base, outcome: "helped", note: null } : null;
    case "not_relevant":
      return note === null
        ? { ...base, outcome: "not_relevant", note: null }
        : null;
    case "stuck":
      return { ...base, outcome: "stuck", note };
  }
}

function recentFirst(
  entries: readonly PathFeedbackMemoryEntry[],
): PathFeedbackMemoryEntry[] {
  return [...entries].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
      right.taskId.localeCompare(left.taskId),
  );
}

/** Compact, deterministic context for the rediagnosis prompt. */
export function formatPathFeedbackMemory(
  entries: readonly PathFeedbackMemoryEntry[],
): string {
  if (entries.length === 0) return "none";

  return recentFirst(entries)
    .slice(0, 12)
    .map((entry) => {
      const base = `${entry.updatedAt} | ${entry.outcome} | ${entry.moduleId} | ${cleanText(entry.title, 160)}`;
      return entry.outcome === "stuck" && entry.note
        ? `${base} | blocker: ${cleanText(entry.note, 400)}`
        : base;
    })
    .join("\n");
}

const MODULE_FALLBACKS: Record<
  ModuleId,
  Record<PathFeedbackOutcome, DiagnosisTask>
> = {
  dossier: {
    helped: {
      module_id: "pitch",
      title: "Use your updated dossier in one tailored pitch",
    },
    not_relevant: {
      module_id: "opportunities",
      title: "Review one saved opportunity instead",
    },
    stuck: {
      module_id: "dossier",
      title: "Write one rough dossier bullet",
    },
  },
  opportunities: {
    helped: {
      module_id: "applications",
      title: "Start the strongest saved application",
    },
    not_relevant: {
      module_id: "helpers",
      title: "Ask one helper where to look next",
    },
    stuck: {
      module_id: "opportunities",
      title: "Review one listing for five minutes",
    },
  },
  applications: {
    helped: {
      module_id: "helpers",
      title: "Ask one person to review the next application",
    },
    not_relevant: {
      module_id: "opportunities",
      title: "Choose a better-fit listing",
    },
    stuck: {
      module_id: "applications",
      title: "Complete one application field",
    },
  },
  pitch: {
    helped: {
      module_id: "applications",
      title: "Send the tailored application",
    },
    not_relevant: {
      module_id: "dossier",
      title: "Strengthen one proof point instead",
    },
    stuck: {
      module_id: "pitch",
      title: "Draft one sentence of the pitch",
    },
  },
  project_plan: {
    helped: {
      module_id: "dossier",
      title: "Add the finished work to your dossier",
    },
    not_relevant: {
      module_id: "skill_stages",
      title: "Choose one role-relevant skill to practice",
    },
    stuck: {
      module_id: "project_plan",
      title: "Finish one small project step",
    },
  },
  interview_prep: {
    helped: {
      module_id: "interview_prep",
      title: "Practice the next interview question",
    },
    not_relevant: {
      module_id: "helpers",
      title: "Ask for one role-specific interview topic",
    },
    stuck: {
      module_id: "interview_prep",
      title: "Outline one interview answer",
    },
  },
  helpers: {
    helped: {
      module_id: "opportunities",
      title: "Use that advice to shortlist one opportunity",
    },
    not_relevant: {
      module_id: "opportunities",
      title: "Review one opportunity without outreach",
    },
    stuck: {
      module_id: "helpers",
      title: "Draft one sentence to a helper",
    },
  },
  skill_stages: {
    helped: {
      module_id: "project_plan",
      title: "Apply that skill in one project step",
    },
    not_relevant: {
      module_id: "opportunities",
      title: "Check one role for the skills it needs",
    },
    stuck: {
      module_id: "skill_stages",
      title: "Practice one small skill example",
    },
  },
};

const SECONDARY_FALLBACKS: Record<
  PathFeedbackOutcome,
  Omit<DiagnosisTask, "module_id">
> = {
  helped: { title: "Continue with the next step" },
  not_relevant: { title: "Try a different path task" },
  stuck: { title: "Do one smaller step" },
};

function normalizedTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function fallbackTask(
  entry: PathFeedbackMemoryEntry,
  ratedTitles: ReadonlySet<string>,
): DiagnosisTask {
  const primary = MODULE_FALLBACKS[entry.moduleId][entry.outcome];
  if (!ratedTitles.has(normalizedTitle(primary.title))) {
    return primary;
  }
  const secondary = SECONDARY_FALLBACKS[entry.outcome];
  let title = secondary.title;
  while (ratedTitles.has(normalizedTitle(title))) {
    title = `${title} next`;
  }
  return { module_id: entry.moduleId, title };
}

function appendUnique(values: readonly string[], value: string): string[] {
  return values.includes(value) ? [...values] : [...values, value];
}

/**
 * Apply the latest rating after AI/heuristic generation.
 * Recently rated tasks are removed even if the model ignored the memory.
 */
export function adaptDiagnosisToPathFeedback(
  result: DiagnosisResult,
  entries: readonly PathFeedbackMemoryEntry[],
): DiagnosisResult {
  const latest = recentFirst(entries)[0];
  if (!latest) return result;

  const ratedTitles = new Set(entries.map((entry) => normalizedTitle(entry.title)));
  const generatedAlternatives = result.tasks.filter(
    (task) => !ratedTitles.has(normalizedTitle(task.title)),
  );
  const tasks =
    generatedAlternatives.length > 0
      ? generatedAlternatives
      : [fallbackTask(latest, ratedTitles)];

  if (latest.outcome === "helped") {
    return {
      ...result,
      diagnosis: {
        ...result.diagnosis,
        strengths: appendUnique(
          result.diagnosis.strengths,
          `Made progress with: ${latest.title}`,
        ),
      },
      tasks,
    };
  }

  if (latest.outcome === "stuck") {
    const blocker = latest.note
      ? `Blocked on "${latest.title}": ${latest.note}`
      : `Blocked on: ${latest.title}`;
    return {
      ...result,
      diagnosis: {
        ...result.diagnosis,
        blockers: appendUnique(result.diagnosis.blockers, blocker),
      },
      tasks,
    };
  }

  return { ...result, tasks };
}
