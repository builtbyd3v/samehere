import type { ReactNode } from "react";
import type { PathPlanUi, UiRecipe } from "@/lib/path/types";
import FocusTrackHome from "./recipes/FocusTrackHome";
import NetworkGapHome from "./recipes/NetworkGapHome";
import OpsDeskHome from "./recipes/OpsDeskHome";
import PrepRoomHome from "./recipes/PrepRoomHome";
import StudioHome from "./recipes/StudioHome";

const RECIPES: Record<
  UiRecipe,
  (props: { plan: PathPlanUi }) => ReactNode
> = {
  studio: StudioHome,
  ops_desk: OpsDeskHome,
  prep_room: PrepRoomHome,
  focus_track: FocusTrackHome,
  network_gap: NetworkGapHome,
};

export default function PathHome({ plan }: { plan: PathPlanUi }) {
  const Recipe = RECIPES[plan.ui_recipe] ?? StudioHome;
  return (
    <main data-path-home data-recipe={plan.ui_recipe} data-tone={plan.tone}>
      <Recipe plan={plan} />
    </main>
  );
}
