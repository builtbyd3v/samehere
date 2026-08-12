"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/path/seeds";
import {
  choosePathTaskToAdvance,
  isFirstProjectCompletion,
  type LinkedPathTask,
} from "@/lib/path/project-completion";

export type ProjectChecklistState = Record<string, boolean>;

export type ProjectActionState = {
  error?: string;
  success?: boolean;
  /** Checklist required items all done (this save). */
  completed?: boolean;
  /** True only on the first transition into done. */
  firstCompletion?: boolean;
  /** True when a path_tasks row was advanced on this save. */
  pathAdvanced?: boolean;
};

function asChecklistState(value: unknown): ProjectChecklistState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: ProjectChecklistState = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

/** Load checklist_state for the viewer, or null when logged out / no row. */
export async function getUserProjectState(
  projectSlug: string,
): Promise<ProjectChecklistState | null> {
  if (!projectSlug || !getProjectBySlug(projectSlug)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_projects")
    .select("checklist_state")
    .eq("user_id", user.id)
    .eq("project_slug", projectSlug)
    .maybeSingle();

  if (!data) return null;
  return asChecklistState(data.checklist_state);
}

type DbClient = Awaited<ReturnType<typeof createClient>>;

/** Best-effort path progression on first project completion. Idempotent. */
async function advancePathOnProjectCompletion(
  supabase: DbClient,
  userId: string,
  linkedPathTaskId: string | null,
): Promise<{ advanced: boolean; taskId: string | null }> {
  let linkedTask: LinkedPathTask | null = null;
  if (linkedPathTaskId) {
    const { data } = await supabase
      .from("path_tasks")
      .select("id, status")
      .eq("id", linkedPathTaskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) linkedTask = { id: data.id, status: data.status };
  }

  let openProjectPlanTaskIds: string[] = [];
  const needFallback =
    !linkedTask ||
    (linkedTask.status !== "todo" &&
      linkedTask.status !== "doing" &&
      linkedTask.status !== "done");

  if (needFallback) {
    const { data } = await supabase
      .from("path_tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("module_id", "project_plan")
      .in("status", ["todo", "doing"])
      .order("sort_index", { ascending: true })
      .limit(1);
    openProjectPlanTaskIds = (data ?? []).map((row) => row.id);
  }

  const choice = choosePathTaskToAdvance({
    linkedPathTaskId,
    linkedTask,
    openProjectPlanTaskIds,
  });
  if (choice.kind === "none") return { advanced: false, taskId: null };

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("path_tasks")
    .update({ status: "done", updated_at: now })
    .eq("id", choice.taskId)
    .eq("user_id", userId)
    .in("status", ["todo", "doing"])
    .select("id")
    .maybeSingle();

  if (error || !updated) return { advanced: false, taskId: null };
  return { advanced: true, taskId: updated.id };
}

/**
 * Upsert checklist progress. Inserts status=doing when missing.
 * Caller passes markDone when every required item is checked.
 * On first completion: advances linked / first open project_plan path task when safe.
 */
export async function saveProjectChecklist(
  projectSlug: string,
  checklist_state: ProjectChecklistState,
  markDone = false,
): Promise<ProjectActionState> {
  if (!projectSlug || !getProjectBySlug(projectSlug)) {
    return { error: "Unknown project." };
  }
  if (!checklist_state || typeof checklist_state !== "object") {
    return { error: "Invalid checklist." };
  }

  const state = asChecklistState(checklist_state);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("user_projects")
    .select("id, status, linked_path_task_id")
    .eq("user_id", user.id)
    .eq("project_slug", projectSlug)
    .maybeSingle();

  const firstCompletion = isFirstProjectCompletion({
    markDone,
    previousStatus: existing?.status,
  });

  if (!existing) {
    const { error } = await supabase.from("user_projects").insert({
      user_id: user.id,
      project_slug: projectSlug,
      status: markDone ? "done" : "doing",
      checklist_state: state,
      completed_at: markDone ? now : null,
    });
    if (error) return { error: "Could not save progress. Try again." };
  } else {
    const nextStatus = markDone
      ? "done"
      : existing.status === "done" || existing.status === "assigned"
        ? "doing"
        : existing.status;

    const { error } = await supabase
      .from("user_projects")
      .update({
        checklist_state: state,
        status: nextStatus,
        completed_at: markDone ? now : null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) return { error: "Could not save progress. Try again." };
  }

  let pathAdvanced = false;
  if (firstCompletion) {
    const result = await advancePathOnProjectCompletion(
      supabase,
      user.id,
      existing?.linked_path_task_id ?? null,
    );
    pathAdvanced = result.advanced;

    // Persist link when we advanced via project_plan fallback (helps idempotency).
    if (result.advanced && result.taskId && !existing?.linked_path_task_id) {
      await supabase
        .from("user_projects")
        .update({ linked_path_task_id: result.taskId, updated_at: now })
        .eq("user_id", user.id)
        .eq("project_slug", projectSlug)
        .is("linked_path_task_id", null);
    }

    revalidatePath("/home");
    revalidatePath(`/projects/${projectSlug}`);
  }

  return {
    success: true,
    completed: markDone,
    firstCompletion,
    pathAdvanced,
  };
}
