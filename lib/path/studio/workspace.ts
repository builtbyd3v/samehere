import type { StudioStarterFile } from "@/lib/path/types";
import { isSafeStudioPath } from "@/lib/path/studio/validate";

/** Matches `project_workspace_files.content` check constraint. */
export const MAX_WORKSPACE_FILE_CONTENT_CHARS = 262144;

/** Matches `project_workspace_files.path` / `active_file` length bound. */
export const MAX_WORKSPACE_PATH_CHARS = 240;

export type ProjectWorkspaceFileSnapshot = {
  path: string;
  content: string;
  revision: number;
};

/** Serializable owner workspace checkpoint for Project Studio. */
export type ProjectWorkspaceSnapshot = {
  templateVersion: number;
  workspaceRevision: number;
  activeFile: string | null;
  files: ProjectWorkspaceFileSnapshot[];
};

export type SaveProjectWorkspaceFileInput = {
  projectSlug: string;
  templateVersion: number;
  path: string;
  content: string;
  expectedWorkspaceRevision: number;
  expectedFileRevision: number;
};

export type SaveProjectWorkspaceFileResult =
  | {
      kind: "success";
      workspaceRevision: number;
      fileRevision: number;
    }
  | {
      kind: "conflict";
      workspaceRevision: number;
      fileRevision: number | null;
      error: string;
    }
  | {
      kind: "error";
      error: string;
    };

export type SeedWorkspaceFile = {
  path: string;
  content: string;
  revision: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/** Boundary parse for save payloads (server actions / future clients). */
export function parseSaveProjectWorkspaceFileInput(
  raw: unknown,
): { ok: true; value: SaveProjectWorkspaceFileInput } | { ok: false; error: string } {
  if (!isPlainObject(raw)) return { ok: false, error: "Invalid save payload." };

  const projectSlug = raw.projectSlug;
  const templateVersion = raw.templateVersion;
  const path = raw.path;
  const content = raw.content;
  const expectedWorkspaceRevision = raw.expectedWorkspaceRevision;
  const expectedFileRevision = raw.expectedFileRevision;

  if (typeof projectSlug !== "string" || projectSlug.trim() === "" || projectSlug.trim() !== projectSlug) {
    return { ok: false, error: "Unknown project." };
  }
  if (!isPositiveInt(templateVersion)) {
    return { ok: false, error: "Invalid template version." };
  }
  if (
    typeof path !== "string" ||
    !isSafeStudioPath(path) ||
    path.length > MAX_WORKSPACE_PATH_CHARS
  ) {
    return { ok: false, error: "Invalid file path." };
  }
  if (typeof content !== "string") {
    return { ok: false, error: "Invalid file content." };
  }
  if (content.length > MAX_WORKSPACE_FILE_CONTENT_CHARS) {
    return { ok: false, error: "File is too large to save." };
  }
  if (!isNonNegativeInt(expectedWorkspaceRevision) || !isNonNegativeInt(expectedFileRevision)) {
    return { ok: false, error: "Invalid revision." };
  }

  return {
    ok: true,
    value: {
      projectSlug,
      templateVersion,
      path,
      content,
      expectedWorkspaceRevision,
      expectedFileRevision,
    },
  };
}

/** Starter file that may be checkpointed (exists and is not read-only). */
export function findWritableStarterFile(
  starterFiles: readonly StudioStarterFile[],
  path: string,
): StudioStarterFile | null {
  const match = starterFiles.find((file) => file.path === path);
  if (!match || match.readOnly === true) return null;
  return match;
}

/**
 * Seed rows for a brand-new workspace: every starter file, with the edited
 * path overlaid at revision 1 and siblings left at revision 0.
 */
export function buildSeededWorkspaceFiles(input: {
  starterFiles: readonly StudioStarterFile[];
  path: string;
  content: string;
}): SeedWorkspaceFile[] {
  return input.starterFiles.map((file) => {
    if (file.path === input.path) {
      return { path: file.path, content: input.content, revision: 1 };
    }
    return { path: file.path, content: file.code, revision: 0 };
  });
}

export function isCreateWorkspaceRevision(input: {
  expectedWorkspaceRevision: number;
  expectedFileRevision: number;
}): boolean {
  return input.expectedWorkspaceRevision === 0 && input.expectedFileRevision === 0;
}

export function shapeSaveSuccess(input: {
  workspaceRevision: number;
  fileRevision: number;
}): Extract<SaveProjectWorkspaceFileResult, { kind: "success" }> {
  return {
    kind: "success",
    workspaceRevision: input.workspaceRevision,
    fileRevision: input.fileRevision,
  };
}

export function shapeSaveConflict(input: {
  workspaceRevision: number;
  fileRevision: number | null;
  error?: string;
}): Extract<SaveProjectWorkspaceFileResult, { kind: "conflict" }> {
  return {
    kind: "conflict",
    workspaceRevision: input.workspaceRevision,
    fileRevision: input.fileRevision,
    error: input.error ?? "This file changed elsewhere. Reload and try again.",
  };
}

export function shapeSaveError(
  error: string,
): Extract<SaveProjectWorkspaceFileResult, { kind: "error" }> {
  return { kind: "error", error };
}

export function toProjectWorkspaceSnapshot(input: {
  templateVersion: number;
  workspaceRevision: number;
  activeFile: string | null;
  files: readonly { path: string; content: string; revision: number }[];
}): ProjectWorkspaceSnapshot {
  const files = [...input.files]
    .map((file) => ({
      path: file.path,
      content: file.content,
      revision: file.revision,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    templateVersion: input.templateVersion,
    workspaceRevision: input.workspaceRevision,
    activeFile: input.activeFile,
    files,
  };
}
