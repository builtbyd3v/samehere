import { describe, expect, it } from "vitest";
import type { IntakeAnswers } from "./diagnose";
import { applicationsNeedPrepRoom, heuristicInterviewFlip } from "./rediagnose";

const baseIntake: IntakeAnswers = {
  stage: "applying",
  constraints: [],
  target_roles: ["SWE Intern"],
  target_companies: ["Stripe"],
  timeline: "this_cycle",
  blocker: "Cold applying feels random",
};

describe("heuristicInterviewFlip", () => {
  it("flips applying intake to prep_room for interview/oa", () => {
    const result = heuristicInterviewFlip(baseIntake);
    expect(result.ui.ui_recipe).toBe("prep_room");
    expect(result.tasks.some((t) => t.module_id === "interview_prep")).toBe(true);
  });

  it("flips studio-stage building intake to prep_room", () => {
    const result = heuristicInterviewFlip({
      ...baseIntake,
      stage: "building",
      blocker: "No projects",
    });
    expect(result.ui.ui_recipe).toBe("prep_room");
  });
});

describe("applicationsNeedPrepRoom", () => {
  it("detects oa and interview statuses", () => {
    expect(applicationsNeedPrepRoom(["wishlist", "applied"])).toBe(false);
    expect(applicationsNeedPrepRoom(["applied", "oa"])).toBe(true);
    expect(applicationsNeedPrepRoom(["interview"])).toBe(true);
  });
});
