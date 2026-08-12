export type UiRecipe =
  | "studio"
  | "ops_desk"
  | "prep_room"
  | "focus_track"
  | "network_gap";

export type ModuleId =
  | "dossier"
  | "opportunities"
  | "applications"
  | "pitch"
  | "project_plan"
  | "interview_prep"
  | "helpers"
  | "skill_stages";

export type PathPlanUi = {
  ui_recipe: UiRecipe;
  module_order: ModuleId[];
  nav_emphasis: string[];
  tone: "steady" | "urgent" | "encouraging";
  headline: string;
  why: string;
};

export type PathStage =
  | "no_experience"
  | "building"
  | "applying"
  | "interviewing"
  | "offer";

export type RecipeFallbackInput = {
  stage: PathStage;
  constraints?: string[];
  /** Strong dossier / appointable profile signal from diagnosis. */
  profileStrong?: boolean;
};
