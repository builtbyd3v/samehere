import type { ReactNode } from "react";
import type { PathTaskSummary } from "@/lib/path/load-home-data";
import type { PathPlanUi, UiRecipe } from "@/lib/path/types";
import PathTaskAction from "./PathTaskAction";
import PathTaskFeedback from "./PathTaskFeedback";

const RECIPE_ID: Record<UiRecipe, string> = {
  studio: "studio",
  ops_desk: "ops desk",
  prep_room: "prep room",
  focus_track: "focus track",
  network_gap: "network gap",
};

/** Build=0, Apply=1, Prepare=2 — matches landing PathSystem track. */
const RECIPE_STAGE: Record<UiRecipe, 0 | 1 | 2> = {
  studio: 0,
  ops_desk: 1,
  network_gap: 1,
  focus_track: 1,
  prep_room: 2,
};

const STAGES = ["Build", "Apply", "Prepare"] as const;

const RECIPE_MODIFIER: Record<UiRecipe, { label: string; detail: string }> = {
  studio: {
    label: "Focus mode",
    detail: "One task stays visible. Everything else waits.",
  },
  ops_desk: {
    label: "Ops desk",
    detail: "Company helpers move forward when they can help.",
  },
  network_gap: {
    label: "Network gap",
    detail: "Company helpers move forward when they can help.",
  },
  focus_track: {
    label: "Focus mode",
    detail: "One task stays visible. Everything else waits.",
  },
  prep_room: {
    label: "Interview focus",
    detail: "The next interview stays ahead of new listings.",
  },
};

const TONE_DETAIL: Record<PathPlanUi["tone"], string> = {
  steady: "One clear next move. No noise.",
  urgent: "Time-sensitive. Ship the next action first.",
  encouraging: "You're on track. Finish the next step.",
};

function modifierFor(plan: PathPlanUi) {
  const base = RECIPE_MODIFIER[plan.ui_recipe];
  return {
    label: base.label,
    detail: plan.tone === "steady" ? base.detail : TONE_DETAIL[plan.tone],
  };
}

export default function PathHero({
  plan,
  nextTask,
  taskHref,
  children,
}: {
  plan: PathPlanUi;
  nextTask?: PathTaskSummary;
  taskHref?: string;
  children?: ReactNode;
}) {
  const stageIndex = RECIPE_STAGE[plan.ui_recipe];
  const modifier = modifierFor(plan);

  return (
    <div
      data-tone={plan.tone}
      className="landing-path-preview path-hero"
      aria-label="Your adaptive path"
    >
      <header>
        <span>Your path</span>
        <span>{RECIPE_ID[plan.ui_recipe]}</span>
      </header>

      <div className="landing-path-next">
        <span>Next move</span>
        <p>{nextTask?.title ?? plan.headline}</p>
      </div>

      <p className="path-hero-why">{nextTask?.detail ?? plan.why}</p>

      <div className="landing-path-track" aria-label="Path stage">
        {STAGES.map((stage, index) => (
          <span
            key={stage}
            className={index === stageIndex ? "is-current" : undefined}
          >
            {stage}
            {index === stageIndex ? (
              <span className="landing-path-stage-line" aria-hidden />
            ) : null}
          </span>
        ))}
      </div>

      <div className="landing-path-modifier" data-tone={plan.tone}>
        <span>{modifier.label}</span>
        {modifier.detail}
      </div>

      {nextTask && taskHref ? (
        <div className="path-hero-actions">
          <PathTaskAction taskId={nextTask.id} href={taskHref} status={nextTask.status} />
          <PathTaskFeedback taskId={nextTask.id} />
        </div>
      ) : children ? (
        <div className="path-hero-actions">{children}</div>
      ) : null}
    </div>
  );
}
