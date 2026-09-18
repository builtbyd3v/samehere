import type { Database } from "@/types/database.types";
import type { PortfolioProject, PortfolioSettings, ProjectStatus } from "@/types/portfolio";
import { PORTFOLIO_SECTIONS } from "./validation";
import { orderedSections } from "./projection";

export type ProjectRow = Database["public"]["Tables"]["portfolio_projects"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["portfolio_settings"]["Row"];

export function rowToProject(row: ProjectRow): PortfolioProject {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    personalRole: row.personal_role,
    technologies: row.technologies,
    keyFeatures: row.key_features,
    repoUrl: row.repo_url,
    demoUrl: row.demo_url,
    status: row.status === "published" ? "published" : "draft",
    sort_order: row.sort_order,
    published_at: row.published_at,
    source_repository_id: row.source_repository_id,
    source_commit_sha: row.source_commit_sha,
    source_analysis_id: row.source_analysis_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function rowToSettings(row: SettingsRow): PortfolioSettings {
  return {
    owner_id: row.owner_id,
    publish_intro: row.publish_intro,
    publish_projects: row.publish_projects,
    publish_activity: row.publish_activity,
    publish_experience: row.publish_experience,
    publish_education: row.publish_education,
    publish_posts: row.publish_posts,
    allow_indexing: row.allow_indexing,
    section_order: orderedSections(row.section_order),
    updated_at: row.updated_at,
    version: row.version,
  };
}

export function defaultSettings(ownerId: string): PortfolioSettings {
  return {
    owner_id: ownerId,
    publish_intro: false,
    publish_projects: false,
    publish_activity: false,
    publish_experience: false,
    publish_education: false,
    publish_posts: false,
    allow_indexing: false,
    section_order: [...PORTFOLIO_SECTIONS],
    updated_at: new Date(0).toISOString(),
    version: 0,
  };
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

export function writeColumns(input: {
  title: string;
  summary: string | null;
  description: string | null;
  personalRole: string | null;
  technologies: string[];
  keyFeatures: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  status?: ProjectStatus;
}) {
  return {
    title: input.title.trim(),
    summary: emptyToNull(input.summary),
    description: emptyToNull(input.description),
    personal_role: emptyToNull(input.personalRole),
    technologies: input.technologies.map((item) => item.trim()),
    key_features: input.keyFeatures.map((item) => item.trim()),
    repo_url: emptyToNull(input.repoUrl),
    demo_url: emptyToNull(input.demoUrl),
    ...(input.status ? { status: input.status } : {}),
  };
}
