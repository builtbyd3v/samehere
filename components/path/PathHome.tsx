import type { ReactNode } from "react";
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

export default function PathHome({
  plan,
  listings,
  applicationStages,
  context,
}: PathHomeData) {
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
      <div className="mx-auto w-full max-w-3xl px-5 pb-10 pt-2 md:px-0">
        <RediagnoseForm compact />
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
      return "/profile/edit";
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
      return "/messages";
  }
}
