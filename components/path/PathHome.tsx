import type { ReactNode } from "react";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
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
}: PathHomeData) {
  const Recipe = RECIPES[plan.ui_recipe] ?? StudioHome;
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
      />
      <div className="mx-auto w-full max-w-3xl px-5 pb-10 pt-2 md:px-0">
        <RediagnoseForm compact />
      </div>
    </main>
  );
}
