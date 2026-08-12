import type { RecipeFallbackInput, UiRecipe } from "./types";

const FOCUS_CONSTRAINTS = new Set([
  "overwhelmed",
  "focus",
  "burnout",
  "working_job",
  "commuter",
]);

/** Server-side recipe pick when AI returns an invalid ui_recipe. */
export function pickRecipeFallback(input: RecipeFallbackInput): UiRecipe {
  const constraints = input.constraints ?? [];
  const hasFocusConstraint = constraints.some((c) => FOCUS_CONSTRAINTS.has(c));

  if (input.stage === "interviewing") return "prep_room";
  if (hasFocusConstraint) return "focus_track";
  if (input.stage === "no_experience" || input.stage === "building") return "studio";
  if (constraints.includes("limited_network") && input.profileStrong) {
    return "network_gap";
  }
  return "ops_desk";
}

const RECIPES = new Set<UiRecipe>([
  "studio",
  "ops_desk",
  "prep_room",
  "focus_track",
  "network_gap",
]);

export function isUiRecipe(value: unknown): value is UiRecipe {
  return typeof value === "string" && RECIPES.has(value as UiRecipe);
}

/** Prefer model recipe when valid; otherwise heuristic. */
export function resolveUiRecipe(
  candidate: unknown,
  input: RecipeFallbackInput,
): UiRecipe {
  return isUiRecipe(candidate) ? candidate : pickRecipeFallback(input);
}
