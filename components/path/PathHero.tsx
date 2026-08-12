"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { PathTaskSummary } from "@/lib/path/load-home-data";
import type { PathPlanUi, UiRecipe } from "@/lib/path/types";
import PathTaskAction from "./PathTaskAction";
import PathTaskFeedback from "./PathTaskFeedback";

const RECIPE_COPY: Record<UiRecipe, { label: string; context: string }> = {
  studio: {
    label: "Build studio",
    context: "Your path is prioritizing proof you can explain in an interview.",
  },
  ops_desk: {
    label: "Application desk",
    context: "Your path is prioritizing a smaller set of applications worth finishing.",
  },
  prep_room: {
    label: "Interview room",
    context: "Your live interview stays ahead of new listings and project work.",
  },
  focus_track: {
    label: "Focus track",
    context: "Secondary work is muted until this one move is out of the way.",
  },
  network_gap: {
    label: "Warm intro desk",
    context: "Your path is prioritizing useful conversations at target companies.",
  },
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
  const recipe = RECIPE_COPY[plan.ui_recipe];
  const reduced = useReducedMotion();
  const moveTitle = nextTask?.title ?? plan.headline;
  const moveDetail = nextTask?.detail ?? plan.why;

  return (
    <motion.article
      key={plan.ui_recipe}
      data-tone={plan.tone}
      data-recipe={plan.ui_recipe}
      className="path-command-center"
      aria-label="Your adaptive path"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
    >
      <header className="path-command-header">
        <div>
          <p className="path-command-kicker">Your adaptive workspace</p>
          <p className="path-command-recipe">{recipe.label}</p>
        </div>
        <p className="path-command-context">{recipe.context}</p>
      </header>

      <div className="path-command-grid">
        <section className="path-command-recommendation" aria-labelledby="path-next-move">
          <p className="path-command-label">Next move</p>
          <h1 id="path-next-move">{moveTitle}</h1>
          <p className="path-command-detail">{moveDetail}</p>

          {nextTask && taskHref ? (
            <div className="path-hero-actions">
              <PathTaskAction taskId={nextTask.id} href={taskHref} status={nextTask.status} />
              <PathTaskFeedback key={nextTask.id} taskId={nextTask.id} />
            </div>
          ) : children ? (
            <div className="path-hero-actions">{children}</div>
          ) : null}
        </section>

        <aside className="path-command-rationale" aria-label="Why the path changed">
          <p className="path-command-label">Why now</p>
          <p className="path-command-why">{plan.why}</p>

          <div className="path-stage-rail" aria-label={`Current path stage: ${STAGES[stageIndex]}`}>
            <div className="path-stage-track" aria-hidden>
              <motion.span
                initial={false}
                animate={{ scaleX: stageIndex / (STAGES.length - 1) }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 30 }}
              />
            </div>
            <div className="path-stage-labels">
              {STAGES.map((stage, index) => (
                <span key={stage} data-current={index === stageIndex ? "true" : undefined}>
                  {stage}
                </span>
              ))}
            </div>
          </div>

          <div className="path-command-modifier" data-tone={plan.tone}>
            <span>{modifier.label}</span>
            <p>{modifier.detail}</p>
          </div>
        </aside>
      </div>
    </motion.article>
  );
}
