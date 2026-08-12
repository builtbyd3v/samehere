/** Pure helpers for project checklist → path-task progression. */

export type PathTaskStatus = "todo" | "doing" | "done" | "skipped" | string;

export type LinkedPathTask = {
  id: string;
  status: PathTaskStatus;
};

export type PathAdvanceChoice =
  | { kind: "none" }
  | { kind: "advance"; taskId: string; source: "linked" | "project_plan" };

/** True only on the first transition into done (idempotent on re-saves). */
export function isFirstProjectCompletion(input: {
  markDone: boolean;
  previousStatus: string | null | undefined;
}): boolean {
  return input.markDone && input.previousStatus !== "done";
}

/**
 * Prefer the linked path task when it is still open.
 * If linked is already done, do nothing (idempotent).
 * Otherwise fall through to the first open project_plan task.
 */
export function choosePathTaskToAdvance(input: {
  linkedPathTaskId: string | null | undefined;
  linkedTask: LinkedPathTask | null;
  openProjectPlanTaskIds: string[];
}): PathAdvanceChoice {
  if (input.linkedTask) {
    if (input.linkedTask.status === "todo" || input.linkedTask.status === "doing") {
      return {
        kind: "advance",
        taskId: input.linkedTask.id,
        source: "linked",
      };
    }
    if (input.linkedTask.status === "done") {
      return { kind: "none" };
    }
    // skipped / unknown → safe fallthrough
  } else if (input.linkedPathTaskId) {
    // id set but row missing → safe fallthrough
  }

  const first = input.openProjectPlanTaskIds[0];
  if (first) {
    return { kind: "advance", taskId: first, source: "project_plan" };
  }
  return { kind: "none" };
}
