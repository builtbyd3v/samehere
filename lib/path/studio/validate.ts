import type {
  StudioCommands,
  StudioManifest,
  StudioMilestone,
  StudioRuntime,
  StudioStarterFile,
} from "@/lib/path/types";

export type StudioValidationOk = { ok: true; manifest: StudioManifest };
export type StudioValidationErr = { ok: false; errors: string[] };
export type StudioValidationResult = StudioValidationOk | StudioValidationErr;

function isStudioRuntime(value: unknown): value is StudioRuntime {
  return value === "browser_react" || value === "remote_node";
}

/** Reject empty, absolute, traversal, and Windows-separator paths. */
export function isSafeStudioPath(path: string): boolean {
  if (typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed || trimmed !== path) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  if (path.startsWith("/") || path.includes(":")) return false;
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return false;
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim() === value;
}

function pushDuplicate(errors: string[], label: string, value: string, seen: Set<string>) {
  if (seen.has(value)) {
    errors.push(`${label} contains duplicate: ${value}`);
    return true;
  }
  seen.add(value);
  return false;
}

function parseStarterFile(
  value: unknown,
  index: number,
  errors: string[],
): StudioStarterFile | null {
  if (!isPlainObject(value)) {
    errors.push(`starterFiles[${index}] must be an object`);
    return null;
  }

  const path = value.path;
  const code = value.code;
  const readOnly = value.readOnly;
  let ok = true;

  if (typeof path !== "string" || !isSafeStudioPath(path)) {
    errors.push(`starterFiles[${index}].path is missing or unsafe`);
    ok = false;
  }
  if (typeof code !== "string") {
    errors.push(`starterFiles[${index}].code must be a string`);
    ok = false;
  }
  if (readOnly !== undefined && typeof readOnly !== "boolean") {
    errors.push(`starterFiles[${index}].readOnly must be a boolean when set`);
    ok = false;
  }
  if (!ok || typeof path !== "string" || typeof code !== "string") return null;

  const file: StudioStarterFile = { path, code };
  if (typeof readOnly === "boolean") file.readOnly = readOnly;
  return file;
}

function parseMilestone(value: unknown, index: number, errors: string[]): StudioMilestone | null {
  if (!isPlainObject(value)) {
    errors.push(`milestones[${index}] must be an object`);
    return null;
  }

  const id = value.id;
  const checklistId = value.checklistId;
  const title = value.title;
  const acceptance = value.acceptance;
  const testIds = value.testIds;
  let ok = true;

  if (!isNonEmptyString(id)) {
    errors.push(`milestones[${index}].id must be a non-empty string`);
    ok = false;
  }
  if (!isNonEmptyString(checklistId)) {
    errors.push(`milestones[${index}].checklistId must be a non-empty string`);
    ok = false;
  }
  if (!isNonEmptyString(title)) {
    errors.push(`milestones[${index}].title must be a non-empty string`);
    ok = false;
  }
  if (
    !Array.isArray(acceptance) ||
    acceptance.length === 0 ||
    !acceptance.every((item) => isNonEmptyString(item))
  ) {
    errors.push(`milestones[${index}].acceptance must be a non-empty string array`);
    ok = false;
  }
  if (
    testIds !== undefined &&
    (!Array.isArray(testIds) || !testIds.every((item) => isNonEmptyString(item)))
  ) {
    errors.push(`milestones[${index}].testIds must be a string array when set`);
    ok = false;
  }

  if (
    !ok ||
    !isNonEmptyString(id) ||
    !isNonEmptyString(checklistId) ||
    !isNonEmptyString(title) ||
    !Array.isArray(acceptance)
  ) {
    return null;
  }

  const milestone: StudioMilestone = {
    id,
    checklistId,
    title,
    acceptance: acceptance.filter((item): item is string => isNonEmptyString(item)),
  };
  if (Array.isArray(testIds)) {
    milestone.testIds = testIds.filter((item): item is string => isNonEmptyString(item));
  }
  return milestone;
}

function parseCommands(value: unknown, errors: string[]): StudioCommands | null {
  if (!isPlainObject(value)) {
    errors.push("commands must be an object");
    return null;
  }

  const keys = ["preview", "visibleTests", "submission"] as const;
  let ok = true;
  for (const key of keys) {
    if (value[key] !== undefined && !isNonEmptyString(value[key])) {
      errors.push(`commands.${key} must be a non-empty string when set`);
      ok = false;
    }
  }
  if (!ok) return null;

  const commands: StudioCommands = {};
  for (const key of keys) {
    const command = value[key];
    if (isNonEmptyString(command)) commands[key] = command;
  }
  return commands;
}

/**
 * Defensive boundary check for studio manifests.
 * Accepts `unknown` so curated and future catalog payloads share one gate.
 */
export function validateStudioManifest(input: unknown): StudioValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: ["manifest must be an object"] };
  }

  const version = input.version;
  const runtime = input.runtime;
  const language = input.language;
  const technologies = input.technologies;
  const entryFile = input.entryFile;
  const visibleFiles = input.visibleFiles;

  let versionOk = false;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    errors.push("version must be a positive integer");
  } else {
    versionOk = true;
  }

  let runtimeOk = false;
  if (!isStudioRuntime(runtime)) {
    errors.push('runtime must be "browser_react" or "remote_node"');
  } else {
    runtimeOk = true;
  }

  let languageOk = false;
  if (!isNonEmptyString(language)) {
    errors.push("language must be a non-empty string");
  } else {
    languageOk = true;
  }

  let technologiesOk = false;
  if (
    !Array.isArray(technologies) ||
    technologies.length === 0 ||
    !technologies.every((item) => isNonEmptyString(item))
  ) {
    errors.push("technologies must be a non-empty string array");
  } else {
    technologiesOk = true;
  }

  let entryFileValue: string | null = null;
  if (typeof entryFile !== "string" || !isSafeStudioPath(entryFile)) {
    errors.push("entryFile is missing or unsafe");
  } else {
    entryFileValue = entryFile;
  }

  const visibleList: string[] = [];
  if (!Array.isArray(visibleFiles) || visibleFiles.length === 0) {
    errors.push("visibleFiles must be a non-empty array of safe paths");
  } else {
    const seen = new Set<string>();
    let allSafe = true;
    for (const path of visibleFiles) {
      if (typeof path !== "string" || !isSafeStudioPath(path)) {
        allSafe = false;
        continue;
      }
      if (!pushDuplicate(errors, "visibleFiles", path, seen)) {
        visibleList.push(path);
      }
    }
    if (!allSafe) {
      errors.push("visibleFiles must be a non-empty array of safe paths");
    }
  }
  const visibleOk = visibleList.length > 0;

  const starterFiles: StudioStarterFile[] = [];
  if (!Array.isArray(input.starterFiles) || input.starterFiles.length === 0) {
    errors.push("starterFiles must be a non-empty array");
  } else {
    const seen = new Set<string>();
    input.starterFiles.forEach((file, index) => {
      const next = parseStarterFile(file, index, errors);
      if (!next) return;
      if (pushDuplicate(errors, "starterFiles", next.path, seen)) return;
      starterFiles.push(next);
    });
    if (starterFiles.length === 0) {
      errors.push("starterFiles must be a non-empty array");
    }
  }

  const milestones: StudioMilestone[] = [];
  if (!Array.isArray(input.milestones) || input.milestones.length === 0) {
    errors.push("milestones must be a non-empty array");
  } else {
    const idSeen = new Set<string>();
    const checklistSeen = new Set<string>();
    input.milestones.forEach((milestone, index) => {
      const next = parseMilestone(milestone, index, errors);
      if (!next) return;
      if (pushDuplicate(errors, "milestones id", next.id, idSeen)) return;
      if (pushDuplicate(errors, "milestones checklistId", next.checklistId, checklistSeen)) {
        return;
      }
      milestones.push(next);
    });
    if (milestones.length === 0) {
      errors.push("milestones must be a non-empty array");
    }
  }

  const commands = parseCommands(input.commands, errors);

  if (entryFileValue && visibleOk && !visibleList.includes(entryFileValue)) {
    errors.push("entryFile must be included in visibleFiles");
  }

  const starterPaths = new Set(starterFiles.map((file) => file.path));
  if (entryFileValue && starterFiles.length > 0 && !starterPaths.has(entryFileValue)) {
    errors.push("entryFile must exist in starterFiles");
  }

  if (visibleOk && starterFiles.length > 0) {
    for (const path of visibleList) {
      if (!starterPaths.has(path)) {
        errors.push(`visibleFiles path missing from starterFiles: ${path}`);
      }
    }
  }

  if (
    errors.length > 0 ||
    !versionOk ||
    !runtimeOk ||
    !languageOk ||
    !technologiesOk ||
    !entryFileValue ||
    !visibleOk ||
    !commands ||
    starterFiles.length === 0 ||
    milestones.length === 0
  ) {
    return { ok: false, errors };
  }

  // Narrowed above: version/runtime/language/technologies/entryFile are valid.
  if (
    typeof version !== "number" ||
    !isStudioRuntime(runtime) ||
    !isNonEmptyString(language) ||
    !Array.isArray(technologies)
  ) {
    return { ok: false, errors: ["manifest failed internal consistency check"] };
  }

  return {
    ok: true,
    manifest: {
      version,
      runtime,
      language,
      technologies: technologies.filter((item): item is string => isNonEmptyString(item)),
      entryFile: entryFileValue,
      visibleFiles: visibleList,
      starterFiles,
      milestones,
      commands,
    },
  };
}

/**
 * Ensure every milestone checklistId exists on the project's build checklist.
 * Used by tests and future catalog publish gates.
 */
export function validateMilestoneChecklistLinkage(
  manifest: StudioManifest,
  checklistIds: readonly string[],
): StudioValidationResult {
  const allowed = new Set(checklistIds);
  const errors: string[] = [];
  for (const milestone of manifest.milestones) {
    if (!allowed.has(milestone.checklistId)) {
      errors.push(
        `milestone "${milestone.id}" checklistId "${milestone.checklistId}" is not on the project checklist`,
      );
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest };
}
