import type { ReactNode } from "react";
import Link from "next/link";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
import type { HomePathContext, PathTaskSummary } from "@/lib/path/load-home-data";
import type { PathPlanUi, UiRecipe } from "@/lib/path/types";
import RediagnoseForm from "./RediagnoseForm";
import FocusTrackHome from "./recipes/FocusTrackHome";
import NetworkGapHome from "./recipes/NetworkGapHome";
import OpsDeskHome from "./recipes/OpsDeskHome";
import PrepRoomHome from "./recipes/PrepRoomHome";
import StudioHome from "./recipes/StudioHome";

export type PathHomeData = {
  plan: PathPlanUi;
  listings?: OpportunityListing[];
  applicationStages?: ApplicationStageCount[];
  context: HomePathContext;
  nextTask?: PathTaskSummary;
  taskHref?: string;
};

const RECIPES: Record<
  UiRecipe,
  (props: PathHomeData) => ReactNode
> = {
  studio: StudioHome,
  ops_desk: OpsDeskHome,
  prep_room: PrepRoomHome,
  focus_track: FocusTrackHome,
  network_gap: NetworkGapHome,
};

const RECIPE_UPSELL: Record<UiRecipe, string> = {
  studio: "Pro unlocks extra project depth when you want a second build in parallel.",
  ops_desk: "Pro writes listing pitches from your dossier.",
  prep_room: "Pro unlocks full company banks and written interview feedback.",
  focus_track: "Pro lets you re-diagnose without waiting when the blocker shifts.",
  network_gap: "Pro drafts helper icebreakers for target orgs.",
};

export default function PathHome({
  plan,
  listings,
  applicationStages,
  context,
  showProUpsell = false,
}: PathHomeData & { showProUpsell?: boolean }) {
  const Recipe = RECIPES[plan.ui_recipe] ?? StudioHome;
  const nextTask = context.tasks[0];
  const taskHref = nextTask
    ? hrefForTask(nextTask.moduleId, context, listings)
    : undefined;
  return (
    <main
      className="page-enter"
      data-path-home
      data-recipe={plan.ui_recipe}
      data-tone={plan.tone}
    >
      <Recipe
        plan={plan}
        listings={listings}
        applicationStages={applicationStages}
        context={context}
        nextTask={nextTask}
        taskHref={taskHref}
      />
      <div className="mx-auto w-full max-w-6xl space-y-3 pb-10 pt-2">
        <RediagnoseForm compact />
        {showProUpsell ? (
          <p className="text-sm text-[var(--ink-muted)]">
            {RECIPE_UPSELL[plan.ui_recipe]}{" "}
            <Link href="/pro" className="underline hover:text-[var(--ink)]">
              See Pro
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}

function hrefForTask(
  moduleId: PathTaskSummary["moduleId"],
  context: HomePathContext,
  listings?: OpportunityListing[],
): string {
  switch (moduleId) {
    case "dossier":
      return context.project?.status === "done"
        ? `/projects/${context.project.slug}`
        : "/profile/edit";
    case "opportunities":
      return listings?.[0] ? `/jobs/${listings[0].id}` : "/jobs";
    case "applications":
      return "/applications";
    case "pitch":
      return listings?.[0] ? `/jobs/${listings[0].id}` : "/jobs";
    case "project_plan":
    case "skill_stages":
      return context.project ? `/projects/${context.project.slug}` : "/home";
    case "interview_prep":
      return context.interview?.bankSlug
        ? `/prep/${encodeURIComponent(context.interview.bankSlug)}`
        : "/prep";
    case "helpers":
      return context.helpers[0]?.href ?? "/messages";
  }
}
