import { describe, expect, it } from "vitest";
import type { DiagnosisResult } from "./diagnose";
import type { ModuleId } from "./types";
import {
  PATH_FEEDBACK_OUTCOMES,
  adaptDiagnosisToPathFeedback,
  describePathShift,
  formatPathFeedbackMemory,
  isPathFeedbackOutcome,
  parsePathFeedbackMemoryEntry,
  type PathFeedbackMemoryEntry,
  type PathShift,
} from "./task-feedback";

const baseResult: DiagnosisResult = {
  ui: {
    ui_recipe: "ops_desk",
    module_order: ["opportunities", "applications"],
    nav_emphasis: ["opportunities"],
    tone: "steady",
    headline: "Move one application",
    why: "The next move is clear.",
  },
  diagnosis: {
    strengths: ["Clear role target"],
    gaps: ["Application volume"],
    blockers: [],
  },
  tasks: [
    { module_id: "applications", title: "Move one application forward" },
    { module_id: "opportunities", title: "Review the next saved role" },
  ],
};

type FeedbackOverrides = {
  taskId?: string;
  moduleId?: ModuleId;
  title?: string;
  updatedAt?: string;
} & (
  | { outcome?: "helped"; note?: null }
  | { outcome: "not_relevant"; note?: null }
  | { outcome: "stuck"; note?: string | null }
);

function feedback(overrides: FeedbackOverrides = {}): PathFeedbackMemoryEntry {
  const base = {
    taskId: overrides.taskId ?? "task-1",
    moduleId: overrides.moduleId ?? "applications",
    title: overrides.title ?? "Move one application forward",
    updatedAt: overrides.updatedAt ?? "2026-08-12T18:00:00.000Z",
  };

  if (overrides.outcome === "not_relevant") {
    return { ...base, outcome: "not_relevant", note: null };
  }
  if (overrides.outcome === "stuck") {
    return { ...base, outcome: "stuck", note: overrides.note ?? null };
  }
  return { ...base, outcome: "helped", note: null };
}

describe("task feedback validation", () => {
  it("accepts only the fixed outcome values", () => {
    expect(PATH_FEEDBACK_OUTCOMES).toEqual([
      "helped",
      "not_relevant",
      "stuck",
    ]);
    expect(isPathFeedbackOutcome("helped")).toBe(true);
    expect(isPathFeedbackOutcome("not_relevant")).toBe(true);
    expect(isPathFeedbackOutcome("stuck")).toBe(true);
    expect(isPathFeedbackOutcome("HELPED")).toBe(false);
    expect(isPathFeedbackOutcome(null)).toBe(false);
    expect(isPathFeedbackOutcome(1)).toBe(false);
  });

  it("validates and cleans joined database rows", () => {
    expect(
      parsePathFeedbackMemoryEntry({
        path_task_id: "task-1",
        outcome: "stuck",
        note: "  Missing a\nreviewer  ",
        updated_at: "2026-08-12T18:00:00.000Z",
        path_tasks: {
          module_id: "applications",
          title: "  Finish the\napplication  ",
        },
      }),
    ).toEqual({
      taskId: "task-1",
      moduleId: "applications",
      title: "Finish the application",
      outcome: "stuck",
      note: "Missing a reviewer",
      updatedAt: "2026-08-12T18:00:00.000Z",
    });
  });

  it("rejects invalid outcomes, modules, timestamps, and non-stuck notes", () => {
    const valid = {
      path_task_id: "task-1",
      outcome: "helped",
      note: null,
      updated_at: "2026-08-12T18:00:00.000Z",
      path_tasks: {
        module_id: "applications",
        title: "Finish the application",
      },
    };

    expect(
      parsePathFeedbackMemoryEntry({ ...valid, outcome: "maybe" }),
    ).toBeNull();
    expect(
      parsePathFeedbackMemoryEntry({
        ...valid,
        path_tasks: { ...valid.path_tasks, module_id: "unknown" },
      }),
    ).toBeNull();
    expect(
      parsePathFeedbackMemoryEntry({ ...valid, updated_at: "yesterday" }),
    ).toBeNull();
    expect(
      parsePathFeedbackMemoryEntry({ ...valid, note: "should be impossible" }),
    ).toBeNull();
  });
});

describe("formatPathFeedbackMemory", () => {
  it("returns a compact newest-first summary with stuck notes", () => {
    expect(
      formatPathFeedbackMemory([
        feedback({
          taskId: "older",
          outcome: "helped",
          updatedAt: "2026-08-10T10:00:00.000Z",
        }),
        feedback({
          taskId: "newer",
          moduleId: "interview_prep",
          title: "Practice a behavioral answer",
          outcome: "stuck",
          note: "I do not have an example",
          updatedAt: "2026-08-12T10:00:00.000Z",
        }),
      ]),
    ).toBe(
      [
        "2026-08-12T10:00:00.000Z | stuck | interview_prep | Practice a behavioral answer | blocker: I do not have an example",
        "2026-08-10T10:00:00.000Z | helped | applications | Move one application forward",
      ].join("\n"),
    );
  });

  it("formats empty memory as none", () => {
    expect(formatPathFeedbackMemory([])).toBe("none");
  });
});

describe("adaptDiagnosisToPathFeedback", () => {
  it("records helped work as a strength and advances to a generated follow-up", () => {
    const result = adaptDiagnosisToPathFeedback(baseResult, [feedback()]);

    expect(result.diagnosis.strengths).toContain(
      "Made progress with: Move one application forward",
    );
    expect(result.tasks).toEqual([
      { module_id: "opportunities", title: "Review the next saved role" },
    ]);
  });

  it("removes a not-relevant recommendation and uses a module-aware fallback", () => {
    const result = adaptDiagnosisToPathFeedback(
      { ...baseResult, tasks: [baseResult.tasks[0]!] },
      [feedback({ outcome: "not_relevant" })],
    );

    expect(result.tasks).toEqual([
      {
        module_id: "opportunities",
        title: "Choose a better-fit listing",
      },
    ]);
  });

  it("records a stuck note and shrinks the next move", () => {
    const result = adaptDiagnosisToPathFeedback(
      { ...baseResult, tasks: [baseResult.tasks[0]!] },
      [feedback({ outcome: "stuck", note: "The form asks for a reference" })],
    );

    expect(result.diagnosis.blockers).toContain(
      'Blocked on "Move one application forward": The form asks for a reference',
    );
    expect(result.tasks).toEqual([
      {
        module_id: "applications",
        title: "Complete one application field",
      },
    ]);
  });

  it("never repeats the latest task, including when it matches the primary fallback", () => {
    const priorTitle = "Review one saved opportunity instead";
    const result = adaptDiagnosisToPathFeedback(
      {
        ...baseResult,
        tasks: [
          {
            module_id: "dossier",
            title: "  REVIEW ONE SAVED OPPORTUNITY INSTEAD ",
          },
        ],
      },
      [
        feedback({
          moduleId: "dossier",
          title: priorTitle,
          outcome: "not_relevant",
        }),
      ],
    );

    expect(result.tasks).toEqual([
      { module_id: "dossier", title: "Try a different path task" },
    ]);
    expect(
      result.tasks.some(
        (task) =>
          task.title.trim().toLowerCase() === priorTitle.toLowerCase(),
      ),
    ).toBe(false);
  });

  it("uses the newest outcome while excluding every recently rated title", () => {
    const result = adaptDiagnosisToPathFeedback(baseResult, [
      feedback({
        taskId: "new",
        title: "Review the next saved role",
        outcome: "stuck",
        note: "No time today",
        updatedAt: "2026-08-13T10:00:00.000Z",
      }),
      feedback({
        taskId: "old",
        outcome: "helped",
        updatedAt: "2026-08-12T10:00:00.000Z",
      }),
    ]);

    expect(result.diagnosis.blockers).toContain(
      'Blocked on "Review the next saved role": No time today',
    );
    expect(result.diagnosis.strengths).not.toContain(
      "Made progress with: Move one application forward",
    );
    expect(result.tasks).toEqual([
      { module_id: "applications", title: "Complete one application field" },
    ]);
    expect(
      result.tasks.some((task) =>
        ["Move one application forward", "Review the next saved role"].includes(
          task.title,
        ),
      ),
    ).toBe(false);
  });
});

describe("describePathShift", () => {
  const baseShift: PathShift = {
    outcome: "helped",
    previousTitle: "Move one application forward",
    nextTitle: "Practice the next interview question",
    recipe: "prep_room",
    recipeChanged: false,
    why: "Your interview is the nearest deadline.",
  };

  it("acknowledges a helped move and names the next one", () => {
    const view = describePathShift(baseShift);
    expect(view.lead).toBe('"Move one application forward" is done.');
    expect(view.next).toBe("Next: Practice the next interview question");
    expect(view.why).toBe("Your interview is the nearest deadline.");
  });

  it("says a dropped move will not come back", () => {
    const view = describePathShift({ ...baseShift, outcome: "not_relevant" });
    expect(view.lead).toBe(
      'Dropped "Move one application forward". It won\'t come back.',
    );
  });

  it("explains a stuck re-plan and a workspace switch", () => {
    const view = describePathShift({
      ...baseShift,
      outcome: "stuck",
      recipeChanged: true,
    });
    expect(view.lead).toBe("Re-planned around your blocker.");
    expect(view.next).toBe(
      "Next: Practice the next interview question. Your workspace switched to Interview room.",
    );
  });

  it("handles an empty queue and a missing why", () => {
    const view = describePathShift({
      ...baseShift,
      nextTitle: null,
      why: null,
    });
    expect(view.next).toBe("Your path is up to date. Nothing else is queued.");
    expect(view.why).toBeNull();
  });
});
