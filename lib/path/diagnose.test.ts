import { describe, expect, it } from "vitest";
import {
  heuristicDiagnosis,
  isPathStage,
  isPathTimeline,
  parseDiagnosisJson,
  type IntakeAnswers,
} from "./diagnose";

const baseIntake: IntakeAnswers = {
  stage: "building",
  constraints: ["transfer"],
  target_roles: ["Software Engineering Intern"],
  target_companies: ["Stripe"],
  timeline: "this_cycle",
  blocker: "No shipped projects yet",
};

describe("isPathStage / isPathTimeline", () => {
  it("accepts known enums only", () => {
    expect(isPathStage("building")).toBe(true);
    expect(isPathStage("dashboard")).toBe(false);
    expect(isPathTimeline("this_cycle")).toBe(true);
    expect(isPathTimeline("someday")).toBe(false);
  });
});

describe("parseDiagnosisJson", () => {
  it("returns heuristic when raw is null or unparseable", () => {
    const fromNull = parseDiagnosisJson(null, baseIntake);
    expect(fromNull.ui.ui_recipe).toBe("studio");
    expect(fromNull.tasks.length).toBeGreaterThan(0);

    const fromJunk = parseDiagnosisJson("not json", baseIntake);
    expect(fromJunk.ui.ui_recipe).toBe("studio");
  });

  it("keeps a valid ui_recipe from the model", () => {
    const raw = JSON.stringify({
      ui_recipe: "ops_desk",
      module_order: ["opportunities", "applications"],
      nav_emphasis: ["applications"],
      tone: "steady",
      headline: "Send the next application",
      why: "You have enough proof to apply with intent.",
      diagnosis: {
        strengths: ["Clear targets"],
        gaps: ["Pipeline thin"],
        blockers: ["Fear of cold apply"],
        confidence: 0.7,
      },
      tasks: [
        { module_id: "applications", title: "Submit one application" },
        { module_id: "nope", title: "bad module" },
      ],
      skill_track_id: "new_grad_swe",
      skill_stage_id: "apply-early",
    });
    const result = parseDiagnosisJson(raw, {
      ...baseIntake,
      stage: "applying",
      constraints: [],
    });
    expect(result.ui.ui_recipe).toBe("ops_desk");
    expect(result.ui.module_order).toEqual(["opportunities", "applications"]);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.module_id).toBe("applications");
    expect(result.diagnosis.strengths).toEqual(["Clear targets"]);
  });

  it("never persists an invalid ui_recipe — uses fallback heuristic", () => {
    const raw = JSON.stringify({
      ui_recipe: "dashboard",
      module_order: ["interview_prep"],
      nav_emphasis: ["home"],
      tone: "urgent",
      headline: "Prep now",
      why: "Interview ahead.",
      diagnosis: { strengths: [], gaps: [], blockers: [] },
      tasks: [{ module_id: "interview_prep", title: "Practice one question" }],
    });
    const result = parseDiagnosisJson(raw, {
      ...baseIntake,
      stage: "interviewing",
      constraints: [],
    });
    expect(result.ui.ui_recipe).toBe("prep_room");
    expect(result.ui.headline).toBe("Prep now");
  });

  it("strips code fences and fills missing modules from fixture", () => {
    const raw =
      '```json\n{"ui_recipe":"focus_track","module_order":[],"nav_emphasis":[],"tone":"steady","headline":"One move","why":"Too much open.","diagnosis":{"strengths":["Honest"],"gaps":["Bandwidth"],"blockers":["Job + school"]},"tasks":[]}\n```';
    const result = parseDiagnosisJson(raw, {
      ...baseIntake,
      stage: "applying",
      constraints: ["working_job"],
    });
    expect(result.ui.ui_recipe).toBe("focus_track");
    expect(result.ui.module_order.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
  });
});

describe("heuristicDiagnosis", () => {
  it("maps interviewing → prep_room and early stage → studio", () => {
    expect(
      heuristicDiagnosis({ ...baseIntake, stage: "interviewing", constraints: [] })
        .ui.ui_recipe,
    ).toBe("prep_room");
    expect(
      heuristicDiagnosis({ ...baseIntake, stage: "no_experience", constraints: [] })
        .ui.ui_recipe,
    ).toBe("studio");
  });

  it("maps limited_network + strong profile → network_gap", () => {
    expect(
      heuristicDiagnosis({
        ...baseIntake,
        stage: "applying",
        constraints: ["limited_network"],
        resume_or_projects: "Built a URL shortener and a campus jobs board",
      }).ui.ui_recipe,
    ).toBe("network_gap");
  });
});
