"use server";

import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/path/seeds";

export type ProjectChecklistState = Record<string, boolean>;

export type ProjectActionState = {
  error?: string;
  success?: boolean;
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

/**
 * Upsert checklist progress. Inserts status=doing when missing.
 * Caller passes markDone when every required item is checked.
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
    .select("id, status")
    .eq("user_id", user.id)
    .eq("project_slug", projectSlug)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("user_projects").insert({
      user_id: user.id,
      project_slug: projectSlug,
      status: markDone ? "done" : "doing",
      checklist_state: state,
      completed_at: markDone ? now : null,
    });
    if (error) return { error: "Could not save progress. Try again." };
    return { success: true };
  }

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
  return { success: true };
}
