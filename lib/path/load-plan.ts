import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PATH_PLAN_UI } from "./fixtures";
import { isUiRecipe } from "./recipe-fallback";
import type { ModuleId, PathPlanUi } from "./types";

const MODULE_IDS = new Set<ModuleId>([
  "dossier",
  "opportunities",
  "applications",
  "pitch",
  "project_plan",
  "interview_prep",
  "helpers",
  "skill_stages",
]);

function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && MODULE_IDS.has(value as ModuleId);
}

/** Narrow unknown JSON from path_plans.ui into PathPlanUi. */
export function normalizePathPlanUi(raw: unknown): PathPlanUi | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isUiRecipe(row.ui_recipe)) return null;
  if (typeof row.headline !== "string" || typeof row.why !== "string") return null;
  if (row.tone !== "steady" && row.tone !== "urgent" && row.tone !== "encouraging") {
    return null;
  }
  if (!Array.isArray(row.module_order) || !Array.isArray(row.nav_emphasis)) return null;

  const module_order = row.module_order.filter(isModuleId);
  if (module_order.length === 0) return null;

  return {
    ui_recipe: row.ui_recipe,
    module_order,
    nav_emphasis: row.nav_emphasis.filter((v): v is string => typeof v === "string"),
    tone: row.tone,
    headline: row.headline,
    why: row.why,
  };
}

type UntypedPathPlans = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { ui: unknown } | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
  };
};

/**
 * Read path_plans.ui for the viewer.
 * Resilient while WS1 types/table are not merged: missing relation / errors → null.
 */
export async function loadViewerPathPlanUi(
  supabase: SupabaseClient,
  userId: string,
): Promise<PathPlanUi | null> {
  try {
    // ponytail: untyped from() until WS1 lands path_plans in database.types.ts
    const client = supabase as unknown as UntypedPathPlans;
    const { data, error } = await client
      .from("path_plans")
      .select("ui")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return null;
    return normalizePathPlanUi(data?.ui ?? null);
  } catch {
    return null;
  }
}

export function pathPlanOrFixture(plan: PathPlanUi | null): PathPlanUi {
  return plan ?? DEFAULT_PATH_PLAN_UI;
}
