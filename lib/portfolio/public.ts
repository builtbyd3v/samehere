import type {
  GithubConnectionPublic,
  GithubConnectionStatus,
  GithubContributionDay,
  PublicPortfolioEducation,
  PublicPortfolioExperience,
  PublicPortfolioProject,
  PublicPortfolioProjection,
} from "@/types/portfolio";
import type { Database } from "@/types/database.types";
import { classifyWriteError, failUnavailable, isPortfolioSchemaMissing, type PortfolioResult } from "./errors";
import { emptyPublicSections, orderedSections, type PublicSectionPayload } from "./projection";
import type { SamehereDay } from "./activity";
import type { PortfolioClient } from "./client";

export type PublicReader = Pick<PortfolioClient, "rpc">;

type PublicPortfolioRow = Database["public"]["Functions"]["get_public_portfolio"]["Returns"][number];
type PublicProjectRow = Database["public"]["Functions"]["get_public_portfolio_projects"]["Returns"][number];
type PublicExperienceRow = Database["public"]["Functions"]["get_public_portfolio_experience"]["Returns"][number];
type PublicEducationRow = Database["public"]["Functions"]["get_public_portfolio_education"]["Returns"][number];
type PublicGithubRow = Database["public"]["Functions"]["get_public_github_contributions"]["Returns"][number];
type PublicHeatmapRow = Database["public"]["Functions"]["get_public_heatmap"]["Returns"][number];
type GithubConnectionRow = Database["public"]["Tables"]["github_connections"]["Row"];
type GithubDayRow = Database["public"]["Tables"]["github_contribution_days"]["Row"];

function mapProjection(row: PublicPortfolioRow): PublicPortfolioProjection {
  return {
    owner_id: row.owner_id,
    username: row.username,
    is_private: row.is_private,
    allow_indexing: row.allow_indexing,
    publish_intro: row.publish_intro,
    publish_projects: row.publish_projects,
    publish_activity: row.publish_activity,
    publish_experience: row.publish_experience,
    publish_education: row.publish_education,
    publish_posts: row.publish_posts,
    activity_visible: row.activity_visible,
    section_order: orderedSections(row.section_order),
  };
}

function mapPublicProject(row: PublicProjectRow): PublicPortfolioProject {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    personal_role: row.personal_role,
    technologies: row.technologies,
    key_features: row.key_features,
    repo_url: row.repo_url,
    demo_url: row.demo_url,
    published_at: row.published_at,
    sort_order: row.sort_order,
  };
}

function mapExperience(row: PublicExperienceRow): PublicPortfolioExperience {
  return {
    id: row.id,
    kind: row.kind,
    org: row.org,
    role: row.role,
    term: row.term,
    note: row.note,
    start_date: row.start_date,
    end_date: row.end_date,
    is_current: row.is_current,
  };
}

function mapEducation(row: PublicEducationRow): PublicPortfolioEducation {
  return {
    id: row.id,
    school: row.school,
    degree: row.degree,
    field: row.field,
    class_year: row.class_year,
    start_date: row.start_date,
    end_date: row.end_date,
    is_current: row.is_current,
  };
}

function mapGithubDay(row: PublicGithubRow | GithubDayRow): GithubContributionDay {
  return {
    connection_id: row.connection_id,
    owner_id: row.owner_id,
    contribution_date: row.contribution_date,
    contribution_count: row.contribution_count,
    contribution_level: row.contribution_level,
    fetched_at: row.fetched_at,
  };
}

function githubStatus(status: string): GithubConnectionStatus | null {
  if (status === "connected" || status === "reauthorization_needed" || status === "disconnected") {
    return status;
  }
  return null;
}

type GithubConnectionSelect = Pick<
  GithubConnectionRow,
  | "id"
  | "owner_id"
  | "github_user_id"
  | "github_login"
  | "epoch"
  | "status"
  | "connected_at"
  | "last_synced_at"
  | "last_sync_error"
  | "last_error_at"
>;

function mapConnection(row: GithubConnectionSelect): GithubConnectionPublic | null {
  const status = githubStatus(row.status);
  if (!status || status === "disconnected") return null;
  return {
    id: row.id,
    owner_id: row.owner_id,
    github_user_id: row.github_user_id,
    github_login: row.github_login,
    epoch: row.epoch,
    status,
    connected_at: row.connected_at,
    last_synced_at: row.last_synced_at,
    last_sync_error: row.last_sync_error,
    last_error_at: row.last_error_at,
  };
}

export async function getPublicPortfolio(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<PublicPortfolioProjection | null>> {
  const { data, error } = await client.rpc("get_public_portfolio", { p_username: username });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  const row = data?.[0];
  if (!row) return { ok: true, data: null };
  return { ok: true, data: mapProjection(row) };
}

export async function getPublicPortfolioProjects(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<PublicPortfolioProject[]>> {
  const { data, error } = await client.rpc("get_public_portfolio_projects", { p_username: username });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return { ok: true, data: (data ?? []).map(mapPublicProject) };
}

export async function getPublicPortfolioExperience(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<PublicPortfolioExperience[]>> {
  const { data, error } = await client.rpc("get_public_portfolio_experience", { p_username: username });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return { ok: true, data: (data ?? []).map(mapExperience) };
}

export async function getPublicPortfolioEducation(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<PublicPortfolioEducation[]>> {
  const { data, error } = await client.rpc("get_public_portfolio_education", { p_username: username });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return { ok: true, data: (data ?? []).map(mapEducation) };
}

export async function getPublicGithubContributions(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<GithubContributionDay[]>> {
  const { data, error } = await client.rpc("get_public_github_contributions", { p_username: username });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return { ok: true, data: (data ?? []).map(mapGithubDay) };
}

export async function getPublicHeatmap(
  client: PublicReader,
  profileId: string
): Promise<PortfolioResult<SamehereDay[]>> {
  const { data, error } = await client.rpc("get_public_heatmap", { p_profile_id: profileId });
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row: PublicHeatmapRow) => ({
      day: row.day,
      points: row.points,
      breakdown: {},
    })),
  };
}

export async function getPublicPortfolioSections(
  client: PublicReader,
  username: string
): Promise<PortfolioResult<PublicSectionPayload>> {
  const [projects, experience, education] = await Promise.all([
    getPublicPortfolioProjects(client, username),
    getPublicPortfolioExperience(client, username),
    getPublicPortfolioEducation(client, username),
  ]);
  if (!projects.ok) return projects;
  if (!experience.ok) return experience;
  if (!education.ok) return education;
  return {
    ok: true,
    data: {
      projects: projects.data,
      experience: experience.data,
      education: education.data,
    },
  };
}

export async function getOwnerGithubConnection(
  client: PortfolioClient,
  ownerId: string
): Promise<PortfolioResult<GithubConnectionPublic | null>> {
  const { data, error } = await client
    .from("github_connections")
    .select(
      "id, owner_id, github_user_id, github_login, epoch, status, connected_at, last_synced_at, last_sync_error, last_error_at"
    )
    .eq("owner_id", ownerId)
    .returns<GithubConnectionSelect>()
    .maybeSingle();
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  if (!data) return { ok: true, data: null };
  return { ok: true, data: mapConnection(data) };
}

export async function getOwnerGithubDays(
  client: PortfolioClient,
  ownerId: string
): Promise<PortfolioResult<GithubContributionDay[]>> {
  const { data, error } = await client
    .from("github_contribution_days")
    .select("connection_id, owner_id, contribution_date, contribution_count, contribution_level, fetched_at")
    .eq("owner_id", ownerId)
    .order("contribution_date", { ascending: true })
    .returns<GithubContributionDay[]>();
  if (error) {
    if (isPortfolioSchemaMissing(error)) return failUnavailable();
    return classifyWriteError(error);
  }
  return { ok: true, data: (data ?? []).map(mapGithubDay) };
}

export async function loadPublicPortfolioBundle(client: PublicReader, username: string) {
  const projection = await getPublicPortfolio(client, username);
  if (!projection.ok) return projection;
  if (!projection.data) {
    return {
      ok: true as const,
      data: {
        projection: null,
        sections: emptyPublicSections(),
        github: [] as GithubContributionDay[],
        samehere: [] as SamehereDay[],
        samehereKnown: true,
      },
    };
  }
  const [sections, github, samehere] = await Promise.all([
    getPublicPortfolioSections(client, username),
    getPublicGithubContributions(client, username),
    projection.data.activity_visible
      ? getPublicHeatmap(client, projection.data.owner_id)
      : Promise.resolve({ ok: true as const, data: [] as SamehereDay[] }),
  ]);
  if (!sections.ok) return sections;
  if (!github.ok) return github;
  if (!samehere.ok) {
    return {
      ok: true as const,
      data: {
        projection: projection.data,
        sections: sections.data,
        github: github.data,
        samehere: [] as SamehereDay[],
        samehereKnown: false,
      },
    };
  }
  return {
    ok: true as const,
    data: {
      projection: projection.data,
      sections: sections.data,
      github: github.data,
      samehere: samehere.data,
      samehereKnown: true,
    },
  };
}

export { emptyPublicSections };
