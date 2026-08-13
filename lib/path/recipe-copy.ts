import type { UiRecipe } from "./types";

/** One label + context line per fixed recipe, shared by the hero and shift notices. */
export const RECIPE_COPY: Record<UiRecipe, { label: string; context: string }> = {
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
