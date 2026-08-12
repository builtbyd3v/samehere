import type { PathPlanUi, UiRecipe } from "./types";

const studio: PathPlanUi[] = [
  {
    ui_recipe: "studio",
    module_order: ["project_plan", "dossier", "skill_stages", "opportunities"],
    nav_emphasis: ["home", "profile"],
    tone: "encouraging",
    headline: "Build this week's project",
    why: "You need one piece of proof before spray-applying makes sense.",
  },
  {
    ui_recipe: "studio",
    module_order: ["project_plan", "skill_stages", "dossier"],
    nav_emphasis: ["home"],
    tone: "steady",
    headline: "Ship something you can defend",
    why: "Transferring mid-cycle is common. A finished project closes the gap faster than more tabs.",
  },
  {
    ui_recipe: "studio",
    module_order: ["dossier", "project_plan", "opportunities"],
    nav_emphasis: ["home", "profile"],
    tone: "encouraging",
    headline: "Fill the experience gap first",
    why: "Your dossier is thin on projects. Build once, then apply with a story.",
  },
];

const opsDesk: PathPlanUi[] = [
  {
    ui_recipe: "ops_desk",
    module_order: ["opportunities", "applications", "pitch", "helpers"],
    nav_emphasis: ["opportunities", "applications"],
    tone: "steady",
    headline: "Move today's application forward",
    why: "You have enough proof. The bottleneck is intentional volume, not another project.",
  },
  {
    ui_recipe: "ops_desk",
    module_order: ["applications", "opportunities", "pitch", "dossier"],
    nav_emphasis: ["applications"],
    tone: "urgent",
    headline: "Keep the pipeline warm",
    why: "Deadlines cluster this week. One strong send beats five half drafts.",
  },
  {
    ui_recipe: "ops_desk",
    module_order: ["opportunities", "pitch", "applications", "helpers"],
    nav_emphasis: ["opportunities"],
    tone: "encouraging",
    headline: "Pick the next listing",
    why: "Your matches are ranked. Start with the strongest fit, not the loudest brand.",
  },
];

const prepRoom: PathPlanUi[] = [
  {
    ui_recipe: "prep_room",
    module_order: ["interview_prep", "helpers", "applications"],
    nav_emphasis: ["home", "messages"],
    tone: "urgent",
    headline: "Prep the interview in front of you",
    why: "New listings can wait. This company's questions are the priority.",
  },
  {
    ui_recipe: "prep_room",
    module_order: ["interview_prep", "applications", "helpers"],
    nav_emphasis: ["home"],
    tone: "steady",
    headline: "Practice the real question",
    why: "You already made it past the screen. Rehearse the opening they will actually ask.",
  },
  {
    ui_recipe: "prep_room",
    module_order: ["interview_prep", "helpers", "dossier"],
    nav_emphasis: ["messages", "home"],
    tone: "encouraging",
    headline: "Own tomorrow's loop",
    why: "A helper at that org plus one practiced answer beats more job scrolling.",
  },
];

const focusTrack: PathPlanUi[] = [
  {
    ui_recipe: "focus_track",
    module_order: ["project_plan"],
    nav_emphasis: ["home"],
    tone: "steady",
    headline: "One move. Then stop.",
    why: "You're carrying too much. Finish this single task before anything else shows up.",
  },
  {
    ui_recipe: "focus_track",
    module_order: ["applications"],
    nav_emphasis: ["home"],
    tone: "encouraging",
    headline: "Send one application",
    why: "Working a job while searching is enough. One send is progress.",
  },
  {
    ui_recipe: "focus_track",
    module_order: ["interview_prep"],
    nav_emphasis: ["home"],
    tone: "urgent",
    headline: "Answer one practice prompt",
    why: "Shrink the surface. One rehearsal today keeps you from freezing tomorrow.",
  },
];

const networkGap: PathPlanUi[] = [
  {
    ui_recipe: "network_gap",
    module_order: ["helpers", "opportunities", "applications", "pitch"],
    nav_emphasis: ["messages", "opportunities"],
    tone: "steady",
    headline: "Ask for a warm intro",
    why: "Your profile is solid. Cold volume alone won't beat a peer who already works there.",
  },
  {
    ui_recipe: "network_gap",
    module_order: ["helpers", "opportunities", "dossier"],
    nav_emphasis: ["messages"],
    tone: "encouraging",
    headline: "Reach the people already inside",
    why: "Limited network is common for first-gen and transfer students. Start with one helper.",
  },
  {
    ui_recipe: "network_gap",
    module_order: ["helpers", "applications", "opportunities"],
    nav_emphasis: ["messages", "applications"],
    tone: "urgent",
    headline: "Draft two icebreakers",
    why: "Target companies are set. Warm threads before you spray applications.",
  },
];

export const PATH_PLAN_FIXTURES: Record<UiRecipe, PathPlanUi[]> = {
  studio,
  ops_desk: opsDesk,
  prep_room: prepRoom,
  focus_track: focusTrack,
  network_gap: networkGap,
};

/** Default home when path_plans is missing or unread (WS1+WS2 will replace). */
export const DEFAULT_PATH_PLAN_UI: PathPlanUi = studio[0];

export function fixtureForRecipe(recipe: UiRecipe, index = 0): PathPlanUi {
  const list = PATH_PLAN_FIXTURES[recipe];
  return list[Math.min(index, list.length - 1)]!;
}
