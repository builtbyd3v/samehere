"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/path/seeds";
import {
  draftDossierFromProject,
  PROJECT_EXPERIENCE_KIND,
} from "@/lib/path/dossier-draft";
import {
  choosePathTaskToAdvance,
  isFirstProjectCompletion,
  type LinkedPathTask,
} from "@/lib/path/project-completion";
import { getStudioManifest } from "@/lib/path/studio";
import {
  buildSeededWorkspaceFiles,
  findWritableStarterFile,
  isCreateWorkspaceRevision,
  parseSaveProjectWorkspaceFileInput,
  shapeSaveConflict,
  shapeSaveError,
  shapeSaveSuccess,
  toProjectWorkspaceSnapshot,
  type ProjectWorkspaceSnapshot,
  type SaveProjectWorkspaceFileInput,
  type SaveProjectWorkspaceFileResult,
} from "@/lib/path/studio/workspace";

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

export type DossierActionState = {
  error?: string;
  success?: boolean;
  already?: boolean;
};

function monthStartIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Insert a project experience from the native path spec.
 * Idempotent on kind=project + role=title. Marks open dossier tasks done.
 */
export async function addProjectToDossier(
  projectSlug: string,
): Promise<DossierActionState> {
  const project = getProjectBySlug(projectSlug);
  if (!project) return { error: "Unknown project." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const draft = draftDossierFromProject(project);

  const { data: existing } = await supabase
    .from("experiences")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", PROJECT_EXPERIENCE_KIND)
    .eq("role", draft.role)
    .maybeSingle();

  if (existing) return { already: true, success: true };

  const start_date = monthStartIso();
  const { error } = await supabase.from("experiences").insert({
    user_id: user.id,
    kind: PROJECT_EXPERIENCE_KIND,
    org: draft.org,
    role: draft.role,
    note: draft.note || null,
    start_date,
    end_date: start_date,
    is_current: false,
  });

  if (error) {
    if (error.message.includes("limit: at most 10 experiences")) {
      return { error: "Dossier is full (10 experiences). Remove one, then add this project." };
    }
    if (error.message.includes("experiences_kind_check") || error.code === "23514") {
      return { error: "Could not save as a project yet. Add it from your dossier." };
    }
    return { error: "Could not add this project to your dossier." };
  }

  const now = new Date().toISOString();
  await supabase
    .from("path_tasks")
    .update({ status: "done", updated_at: now })
    .eq("user_id", user.id)
    .eq("module_id", "dossier")
    .in("status", ["todo", "doing"]);

  revalidatePath("/home");
  revalidatePath("/profile/edit");
  revalidatePath(`/projects/${projectSlug}`);
  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return { success: true };
}

export type {
  ProjectWorkspaceSnapshot,
  SaveProjectWorkspaceFileInput,
  SaveProjectWorkspaceFileResult,
};

/**
 * Owner workspace checkpoint, or null before the first edit / when unavailable.
 * Always scopes by auth user_id; RLS remains the final trust boundary.
 */
export async function getProjectWorkspace(
  projectSlug: string,
): Promise<ProjectWorkspaceSnapshot | null> {
  if (!projectSlug || !getProjectBySlug(projectSlug)) return null;
  const manifest = getStudioManifest(projectSlug);
  if (!manifest) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: assignment } = await supabase
    .from("user_projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("project_slug", projectSlug)
    .maybeSingle();
  if (!assignment) return null;

  const { data: workspace } = await supabase
    .from("project_workspaces")
    .select("id, template_version, revision, active_file")
    .eq("user_id", user.id)
    .eq("user_project_id", assignment.id)
    .maybeSingle();
  if (!workspace) return null;

  const { data: files } = await supabase
    .from("project_workspace_files")
    .select("path, content, revision")
    .eq("user_id", user.id)
    .eq("workspace_id", workspace.id)
    .order("path", { ascending: true });

  return toProjectWorkspaceSnapshot({
    templateVersion: workspace.template_version,
    workspaceRevision: workspace.revision,
    activeFile: workspace.active_file,
    files: files ?? [],
  });
}

async function ensureUserProjectId(
  supabase: DbClient,
  userId: string,
  projectSlug: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("user_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("project_slug", projectSlug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("user_projects")
    .insert({
      user_id: userId,
      project_slug: projectSlug,
      status: "doing",
      checklist_state: {},
    })
    .select("id")
    .maybeSingle();

  if (created) return created.id;

  // Concurrent insert race on (user_id, project_slug) — re-read.
  if (error?.code === "23505") {
    const { data: raced } = await supabase
      .from("user_projects")
      .select("id")
      .eq("user_id", userId)
      .eq("project_slug", projectSlug)
      .maybeSingle();
    return raced?.id ?? null;
  }

  return null;
}

async function loadWorkspaceConflictState(
  supabase: DbClient,
  userId: string,
  workspaceId: string,
  path: string,
): Promise<{ workspaceRevision: number; fileRevision: number | null }> {
  const [{ data: workspace }, { data: file }] = await Promise.all([
    supabase
      .from("project_workspaces")
      .select("revision")
      .eq("user_id", userId)
      .eq("id", workspaceId)
      .maybeSingle(),
    supabase
      .from("project_workspace_files")
      .select("revision")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .eq("path", path)
      .maybeSingle(),
  ]);

  return {
    workspaceRevision: workspace?.revision ?? 0,
    fileRevision: file?.revision ?? null,
  };
}

/**
 * Canonical file checkpoint with optimistic concurrency.
 * First save seeds the full starter tree; later saves never silently overwrite.
 */
export async function saveProjectWorkspaceFile(
  rawInput: SaveProjectWorkspaceFileInput,
): Promise<SaveProjectWorkspaceFileResult> {
  const parsed = parseSaveProjectWorkspaceFileInput(rawInput);
  if (!parsed.ok) return shapeSaveError(parsed.error);

  const input = parsed.value;
  if (!getProjectBySlug(input.projectSlug)) {
    return shapeSaveError("Unknown project.");
  }

  const manifest = getStudioManifest(input.projectSlug);
  if (!manifest) return shapeSaveError("Studio is not available for this project.");

  if (input.templateVersion !== manifest.version) {
    return shapeSaveError("Template version mismatch. Reload the project studio.");
  }

  if (!findWritableStarterFile(manifest.starterFiles, input.path)) {
    return shapeSaveError("That file cannot be edited.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return shapeSaveError("You must be logged in.");

  const userProjectId = await ensureUserProjectId(
    supabase,
    user.id,
    input.projectSlug,
  );
  if (!userProjectId) {
    return shapeSaveError("Could not open your project assignment. Try again.");
  }

  const { data: existingWorkspace } = await supabase
    .from("project_workspaces")
    .select("id, template_version, revision")
    .eq("user_id", user.id)
    .eq("user_project_id", userProjectId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existingWorkspace) {
    if (!isCreateWorkspaceRevision(input)) {
      return shapeSaveConflict({
        workspaceRevision: 0,
        fileRevision: 0,
        error: "Workspace was reset or never saved. Reload and try again.",
      });
    }

    const { data: createdWorkspace, error: createWorkspaceError } = await supabase
      .from("project_workspaces")
      .insert({
        user_id: user.id,
        user_project_id: userProjectId,
        template_version: manifest.version,
        revision: 1,
        active_file: input.path,
        updated_at: now,
      })
      .select("id, revision")
      .maybeSingle();

    if (createWorkspaceError?.code === "23505") {
      // Another request created the workspace first — fall through to update path.
      const { data: racedWorkspace } = await supabase
        .from("project_workspaces")
        .select("id, template_version, revision")
        .eq("user_id", user.id)
        .eq("user_project_id", userProjectId)
        .maybeSingle();
      if (!racedWorkspace) {
        return shapeSaveError("Could not create workspace. Try again.");
      }
      return saveExistingWorkspaceFile({
        supabase,
        userId: user.id,
        workspace: racedWorkspace,
        input,
        manifestVersion: manifest.version,
        now,
      });
    }

    if (createWorkspaceError || !createdWorkspace) {
      return shapeSaveError("Could not create workspace. Try again.");
    }

    const seedFiles = buildSeededWorkspaceFiles({
      starterFiles: manifest.starterFiles,
      path: input.path,
      content: input.content,
    });

    const { error: seedError } = await supabase.from("project_workspace_files").insert(
      seedFiles.map((file) => ({
        user_id: user.id,
        workspace_id: createdWorkspace.id,
        path: file.path,
        content: file.content,
        revision: file.revision,
        updated_at: now,
      })),
    );

    if (seedError) {
      // Best-effort cleanup so a retry can recreate cleanly.
      await supabase
        .from("project_workspaces")
        .delete()
        .eq("user_id", user.id)
        .eq("id", createdWorkspace.id);
      return shapeSaveError("Could not seed workspace files. Try again.");
    }

    const edited = seedFiles.find((file) => file.path === input.path);
    return shapeSaveSuccess({
      workspaceRevision: createdWorkspace.revision,
      fileRevision: edited?.revision ?? 1,
    });
  }

  return saveExistingWorkspaceFile({
    supabase,
    userId: user.id,
    workspace: existingWorkspace,
    input,
    manifestVersion: manifest.version,
    now,
  });
}

async function saveExistingWorkspaceFile(args: {
  supabase: DbClient;
  userId: string;
  workspace: { id: string; template_version: number; revision: number };
  input: SaveProjectWorkspaceFileInput;
  manifestVersion: number;
  now: string;
}): Promise<SaveProjectWorkspaceFileResult> {
  const { supabase, userId, workspace, input, manifestVersion, now } = args;

  if (workspace.template_version !== input.templateVersion) {
    return shapeSaveError("Template version mismatch. Reload the project studio.");
  }
  if (workspace.template_version !== manifestVersion) {
    return shapeSaveError("Template version mismatch. Reload the project studio.");
  }

  const { data: existingFile } = await supabase
    .from("project_workspace_files")
    .select("id, revision")
    .eq("user_id", userId)
    .eq("workspace_id", workspace.id)
    .eq("path", input.path)
    .maybeSingle();

  if (
    workspace.revision !== input.expectedWorkspaceRevision ||
    !existingFile ||
    existingFile.revision !== input.expectedFileRevision
  ) {
    return shapeSaveConflict({
      workspaceRevision: workspace.revision,
      fileRevision: existingFile?.revision ?? null,
    });
  }

  // Claim workspace revision first so a failed file write remains retryable
  // with the returned revisions (file still at the expected revision).
  const nextWorkspaceRevision = workspace.revision + 1;
  const { data: updatedWorkspace, error: workspaceError } = await supabase
    .from("project_workspaces")
    .update({
      revision: nextWorkspaceRevision,
      active_file: input.path,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("id", workspace.id)
    .eq("revision", input.expectedWorkspaceRevision)
    .select("revision")
    .maybeSingle();

  if (workspaceError || !updatedWorkspace) {
    const current = await loadWorkspaceConflictState(
      supabase,
      userId,
      workspace.id,
      input.path,
    );
    return shapeSaveConflict(current);
  }

  const nextFileRevision = existingFile.revision + 1;
  const { data: updatedFile, error: fileError } = await supabase
    .from("project_workspace_files")
    .update({
      content: input.content,
      revision: nextFileRevision,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("workspace_id", workspace.id)
    .eq("path", input.path)
    .eq("revision", input.expectedFileRevision)
    .select("revision")
    .maybeSingle();

  if (fileError || !updatedFile) {
    const current = await loadWorkspaceConflictState(
      supabase,
      userId,
      workspace.id,
      input.path,
    );
    return shapeSaveConflict({
      ...current,
      error:
        "File changed while saving. Reload and retry with the latest revisions.",
    });
  }

  return shapeSaveSuccess({
    workspaceRevision: updatedWorkspace.revision,
    fileRevision: updatedFile.revision,
  });
}
