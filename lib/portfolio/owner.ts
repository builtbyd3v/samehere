import type {
  OpenToTag,
  PortfolioProject,
  PortfolioPublishFlags,
  PortfolioSection,
  PortfolioSettings,
  ProjectWriteInput,
} from "@/types/portfolio";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";
import {
  OPEN_TO_TAGS,
  PORTFOLIO_SECTIONS,
  openToError,
  portfolioPublishConflict,
  projectWriteError,
  sectionOrderError,
} from "./validation";
import { classifyWriteError, fail, failUnavailable, isPortfolioSchemaMissing, type PortfolioQueryError, type PortfolioResult } from "./errors";
import { defaultSettings, rowToProject, rowToSettings, writeColumns, type ProjectRow, type SettingsRow } from "./map";
import { stripSourceFields } from "./analysis-seam";
import type { PortfolioClient } from "./client";

export type OwnerClient = Pick<PortfolioClient, "from">;

const PROJECT_SELECT =
  "id, owner_id, title, summary, description, personal_role, technologies, key_features, repo_url, demo_url, status, sort_order, published_at, source_repository_id, source_commit_sha, source_analysis_id, created_at, updated_at";

const SETTINGS_SELECT =
  "owner_id, publish_intro, publish_projects, publish_activity, publish_experience, publish_education, publish_posts, allow_indexing, section_order, updated_at, version";

async function awaitQuery<T>(
  query: PromiseLike<{ data: T; error: PortfolioQueryError | null }>
): Promise<PortfolioResult<T>> {
  const { data, error } = await query;
  if (error) return classifyWriteError(error);
  return { ok: true, data };
}

export function parseProjectWrite(body: unknown): PortfolioResult<ProjectWriteInput> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return fail("Invalid input.", 400);
  }
  const raw = stripSourceFields(body as Record<string, unknown>);
  if ("status" in raw && raw.status !== "draft" && raw.status !== "published") {
    return fail("Invalid input.", 400);
  }
  const input: ProjectWriteInput = {
    title: typeof raw.title === "string" ? raw.title : "",
    summary: typeof raw.summary === "string" ? raw.summary : raw.summary === null ? null : null,
    description: typeof raw.description === "string" ? raw.description : null,
    personalRole:
      typeof raw.personalRole === "string"
        ? raw.personalRole
        : typeof raw.personal_role === "string"
          ? raw.personal_role
          : null,
    technologies: Array.isArray(raw.technologies) ? raw.technologies.map(String) : [],
    keyFeatures: Array.isArray(raw.keyFeatures)
      ? raw.keyFeatures.map(String)
      : Array.isArray(raw.key_features)
        ? raw.key_features.map(String)
        : [],
    repoUrl: typeof raw.repoUrl === "string" ? raw.repoUrl : typeof raw.repo_url === "string" ? raw.repo_url : null,
    demoUrl: typeof raw.demoUrl === "string" ? raw.demoUrl : typeof raw.demo_url === "string" ? raw.demo_url : null,
    status: raw.status === "published" ? "published" : "draft",
  };
  if (typeof raw.personalRole !== "string" && typeof raw.personal_role === "string") {
    input.personalRole = raw.personal_role;
  }
  const error = projectWriteError(input);
  if (error) return fail(error, 400);
  return { ok: true, data: input };
}

export async function listOwnerProjects(client: OwnerClient, ownerId: string): Promise<PortfolioResult<PortfolioProject[]>> {
  const result = await awaitQuery<ProjectRow[] | null>(
    client
      .from("portfolio_projects")
      .select(PROJECT_SELECT)
      .eq("owner_id", ownerId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .returns<ProjectRow[]>()
  );
  if (!result.ok) return result;
  return { ok: true, data: (result.data ?? []).map(rowToProject) };
}

export async function getOwnerProject(
  client: OwnerClient,
  ownerId: string,
  id: string
): Promise<PortfolioResult<PortfolioProject>> {
  const result = await awaitQuery<ProjectRow | null>(
    client
      .from("portfolio_projects")
      .select(PROJECT_SELECT)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .returns<ProjectRow>()
      .maybeSingle()
  );
  if (!result.ok) return result;
  if (!result.data) return fail(PORTFOLIO_RPC_ERRORS.notFound, 404);
  return { ok: true, data: rowToProject(result.data) };
}

export async function createProject(
  client: OwnerClient,
  ownerId: string,
  input: ProjectWriteInput
): Promise<PortfolioResult<PortfolioProject>> {
  const parsed = parseProjectWrite({ ...input, status: "draft" });
  if (!parsed.ok) return parsed;
  const listed = await listOwnerProjects(client, ownerId);
  if (!listed.ok) return listed;
  const sortOrder = listed.data.reduce((max, project) => Math.max(max, project.sort_order), -1) + 1;
  const columns = writeColumns({ ...parsed.data, status: "draft" });
  const result = await awaitQuery<ProjectRow | null>(
    client
      .from("portfolio_projects")
      .insert({ ...columns, owner_id: ownerId, sort_order: sortOrder })
      .select(PROJECT_SELECT)
      .returns<ProjectRow>()
      .maybeSingle()
  );
  if (!result.ok) return result;
  if (!result.data) return fail("Could not create project.", 500);
  return { ok: true, data: rowToProject(result.data) };
}

export async function updateProjectFields(
  client: OwnerClient,
  ownerId: string,
  id: string,
  input: ProjectWriteInput
): Promise<PortfolioResult<PortfolioProject>> {
  const existing = await getOwnerProject(client, ownerId, id);
  if (!existing.ok) return existing;
  const next: ProjectWriteInput = { ...input, status: existing.data.status };
  const error = projectWriteError(next);
  if (error) return fail(error, 400);
  const columns = writeColumns({
    title: next.title,
    summary: next.summary,
    description: next.description,
    personalRole: next.personalRole,
    technologies: next.technologies,
    keyFeatures: next.keyFeatures,
    repoUrl: next.repoUrl,
    demoUrl: next.demoUrl,
  });
  const result = await awaitQuery<ProjectRow | null>(
    client
      .from("portfolio_projects")
      .update(columns)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select(PROJECT_SELECT)
      .returns<ProjectRow>()
      .maybeSingle()
  );
  if (!result.ok) return result;
  if (!result.data) return fail(PORTFOLIO_RPC_ERRORS.notFound, 404);
  return { ok: true, data: rowToProject(result.data) };
}

export async function setProjectStatus(
  client: OwnerClient,
  ownerId: string,
  id: string,
  status: "draft" | "published",
  roleConfirmed: boolean
): Promise<PortfolioResult<PortfolioProject>> {
  const existing = await getOwnerProject(client, ownerId, id);
  if (!existing.ok) return existing;
  if (status === "published") {
    if (!roleConfirmed) return fail("Confirm your personal role before publishing.", 400);
    const error = projectWriteError({ ...existing.data, status: "published" });
    if (error) return fail(error, 400);
  }
  const result = await awaitQuery<ProjectRow | null>(
    client
      .from("portfolio_projects")
      .update({ status })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select(PROJECT_SELECT)
      .returns<ProjectRow>()
      .maybeSingle()
  );
  if (!result.ok) return result;
  if (!result.data) return fail(PORTFOLIO_RPC_ERRORS.notFound, 404);
  return { ok: true, data: rowToProject(result.data) };
}

export async function deleteProject(
  client: OwnerClient,
  ownerId: string,
  id: string
): Promise<PortfolioResult<{ id: string }>> {
  const existing = await getOwnerProject(client, ownerId, id);
  if (!existing.ok) return existing;
  const result = await awaitQuery<null>(
    client.from("portfolio_projects").delete().eq("id", id).eq("owner_id", ownerId)
  );
  if (!result.ok) return result;
  return { ok: true, data: { id } };
}

export async function reorderProjects(
  client: OwnerClient,
  ownerId: string,
  ids: string[]
): Promise<PortfolioResult<PortfolioProject[]>> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    return fail("Invalid input.", 400);
  }
  if (new Set(ids).size !== ids.length) return fail("Invalid input.", 400);
  const listed = await listOwnerProjects(client, ownerId);
  if (!listed.ok) return listed;
  const owned = new Set(listed.data.map((project) => project.id));
  if (ids.length !== owned.size || ids.some((id) => !owned.has(id))) {
    return fail("Invalid input.", 400);
  }
  for (const [index, id] of ids.entries()) {
    const result = await awaitQuery<null>(
      client.from("portfolio_projects").update({ sort_order: index }).eq("id", id).eq("owner_id", ownerId)
    );
    if (!result.ok) return result;
  }
  return listOwnerProjects(client, ownerId);
}

async function loadOwnerSettingsRow(
  client: OwnerClient,
  ownerId: string
): Promise<PortfolioResult<SettingsRow | null>> {
  return awaitQuery<SettingsRow | null>(
    client.from("portfolio_settings").select(SETTINGS_SELECT).eq("owner_id", ownerId).returns<SettingsRow>().maybeSingle()
  );
}

export async function getOwnerSettings(
  client: OwnerClient,
  ownerId: string
): Promise<PortfolioResult<PortfolioSettings>> {
  const result = await loadOwnerSettingsRow(client, ownerId);
  if (!result.ok) return result;
  if (!result.data) return { ok: true, data: defaultSettings(ownerId) };
  return { ok: true, data: rowToSettings(result.data) };
}

function settingsValues(
  ownerId: string,
  flags: PortfolioPublishFlags,
  order: PortfolioSection[]
) {
  return {
    owner_id: ownerId,
    publish_intro: flags.publish_intro,
    publish_projects: flags.publish_projects,
    publish_activity: flags.publish_activity,
    publish_experience: flags.publish_experience,
    publish_education: flags.publish_education,
    publish_posts: flags.publish_posts,
    allow_indexing: flags.allow_indexing,
    section_order: order,
  };
}

async function updateOwnerSettings(
  client: OwnerClient,
  ownerId: string,
  values: ReturnType<typeof settingsValues>
): Promise<PortfolioResult<PortfolioSettings>> {
  const result = await awaitQuery<SettingsRow | null>(
    client
      .from("portfolio_settings")
      .update(values)
      .eq("owner_id", ownerId)
      .select(SETTINGS_SELECT)
      .returns<SettingsRow>()
      .maybeSingle()
  );
  if (!result.ok) return result;
  if (!result.data) return fail("Could not save publication settings.", 500);
  return { ok: true, data: rowToSettings(result.data) };
}

export async function saveOwnerSettings(
  client: OwnerClient,
  ownerId: string,
  flags: PortfolioPublishFlags,
  sectionOrder: PortfolioSection[] | undefined,
  opts: { isPrivate: boolean; isPro: boolean }
): Promise<PortfolioResult<PortfolioSettings>> {
  const loaded = await loadOwnerSettingsRow(client, ownerId);
  if (!loaded.ok) return loaded;
  const current = loaded.data ? rowToSettings(loaded.data) : defaultSettings(ownerId);
  const order = opts.isPro && sectionOrder ? sectionOrder : current.section_order;
  const orderError = sectionOrderError(order);
  if (orderError) return fail(orderError, 400);
  if (opts.isPrivate && portfolioPublishConflict(true, flags)) {
    // Save is allowed; public RPCs AND with not private. Caller shows the conflict.
  }
  const values = settingsValues(ownerId, flags, order);
  if (loaded.data) return updateOwnerSettings(client, ownerId, values);

  const inserted = await client
    .from("portfolio_settings")
    .insert(values)
    .select(SETTINGS_SELECT)
    .returns<SettingsRow>()
    .maybeSingle();
  if (inserted.error?.code === "23505") {
    const again = await loadOwnerSettingsRow(client, ownerId);
    if (!again.ok) return again;
    const existing = again.data ? rowToSettings(again.data) : current;
    const retryOrder = opts.isPro && sectionOrder ? sectionOrder : existing.section_order;
    return updateOwnerSettings(client, ownerId, settingsValues(ownerId, flags, retryOrder));
  }
  if (inserted.error) return classifyWriteError(inserted.error);
  if (!inserted.data) return fail("Could not save publication settings.", 500);
  return { ok: true, data: rowToSettings(inserted.data) };
}

export function parsePublishFlags(body: unknown): PortfolioResult<PortfolioPublishFlags & { section_order?: PortfolioSection[] }> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return fail("Invalid input.", 400);
  }
  const raw = body as Record<string, unknown>;
  const bool = (key: keyof PortfolioPublishFlags) => raw[key] === true;
  const flags: PortfolioPublishFlags = {
    publish_intro: bool("publish_intro"),
    publish_projects: bool("publish_projects"),
    publish_activity: bool("publish_activity"),
    publish_experience: bool("publish_experience"),
    publish_education: bool("publish_education"),
    publish_posts: bool("publish_posts"),
    allow_indexing: bool("allow_indexing"),
  };
  let section_order: PortfolioSection[] | undefined;
  if (raw.section_order !== undefined) {
    if (!Array.isArray(raw.section_order) || raw.section_order.some((item) => typeof item !== "string")) {
      return fail("Invalid input.", 400);
    }
    const order = raw.section_order.map(String);
    const error = sectionOrderError(order);
    if (error) return fail(error, 400);
    const allowed = new Set<string>(PORTFOLIO_SECTIONS);
    section_order = order.filter((item): item is PortfolioSection => allowed.has(item));
  }
  return { ok: true, data: { ...flags, section_order } };
}

export function parseOpenTo(values: unknown): PortfolioResult<OpenToTag[]> {
  const tags = Array.isArray(values) ? values.map(String) : [];
  const error = openToError(tags);
  if (error) return fail(error, 400);
  return { ok: true, data: tags.filter((tag): tag is OpenToTag => (OPEN_TO_TAGS as readonly string[]).includes(tag)) };
}

export { isPortfolioSchemaMissing, failUnavailable, portfolioPublishConflict };
