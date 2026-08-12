import { describe, expect, it } from "vitest";
import {
  choosePathTaskToAdvance,
  isFirstProjectCompletion,
} from "./project-completion";

describe("isFirstProjectCompletion", () => {
  it("is true only when marking done from a non-done status", () => {
    expect(isFirstProjectCompletion({ markDone: true, previousStatus: null })).toBe(true);
    expect(isFirstProjectCompletion({ markDone: true, previousStatus: "doing" })).toBe(true);
    expect(isFirstProjectCompletion({ markDone: true, previousStatus: "assigned" })).toBe(true);
    expect(isFirstProjectCompletion({ markDone: true, previousStatus: "done" })).toBe(false);
    expect(isFirstProjectCompletion({ markDone: false, previousStatus: "doing" })).toBe(false);
  });
});

describe("choosePathTaskToAdvance", () => {
  it("advances the linked open task", () => {
    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: "t1",
        linkedTask: { id: "t1", status: "todo" },
        openProjectPlanTaskIds: ["pp1"],
      }),
    ).toEqual({ kind: "advance", taskId: "t1", source: "linked" });
  });

  it("is a no-op when the linked task is already done", () => {
    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: "t1",
        linkedTask: { id: "t1", status: "done" },
        openProjectPlanTaskIds: ["pp1"],
      }),
    ).toEqual({ kind: "none" });
  });

  it("falls through to the first open project_plan when linked is skipped or missing", () => {
    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: "t1",
        linkedTask: { id: "t1", status: "skipped" },
        openProjectPlanTaskIds: ["pp1", "pp2"],
      }),
    ).toEqual({ kind: "advance", taskId: "pp1", source: "project_plan" });

    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: "ghost",
        linkedTask: null,
        openProjectPlanTaskIds: ["pp1"],
      }),
    ).toEqual({ kind: "advance", taskId: "pp1", source: "project_plan" });
  });

  it("uses the first open project_plan when nothing is linked", () => {
    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: null,
        linkedTask: null,
        openProjectPlanTaskIds: ["pp1"],
      }),
    ).toEqual({ kind: "advance", taskId: "pp1", source: "project_plan" });
  });

  it("returns none when there is nothing safe to advance", () => {
    expect(
      choosePathTaskToAdvance({
        linkedPathTaskId: null,
        linkedTask: null,
        openProjectPlanTaskIds: [],
      }),
    ).toEqual({ kind: "none" });
  });
});
