import type {
  PortfolioProject,
  PortfolioSection,
  PublicPortfolioEducation,
  PublicPortfolioExperience,
  PublicPortfolioProject,
  PublicPortfolioProjection,
} from "@/types/portfolio";
import { profileShareDescription } from "@/lib/og/copy";
import { PORTFOLIO_SECTIONS, sectionOrderError } from "./validation";

export type ProfileIdentity = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  goals: string | null;
  open_to: string[] | null;
  study_mode: string | null;
  is_private: boolean;
};

export type ProfileRobots = { index: boolean; follow: boolean };

export function robotsForProjection(
  projection: PublicPortfolioProjection | null,
  unavailable: boolean
): ProfileRobots {
  if (unavailable || !projection?.allow_indexing) {
    return { index: false, follow: false };
  }
  return { index: true, follow: true };
}

export function publicSectionVisible(
  projection: PublicPortfolioProjection,
  section: PortfolioSection
): boolean {
  if (projection.is_private && section !== "posts") return false;
  switch (section) {
    case "intro":
      return projection.publish_intro;
    case "projects":
      return projection.publish_projects;
    case "activity":
      return projection.activity_visible;
    case "experience":
      return projection.publish_experience;
    case "education":
      return projection.publish_education;
    case "posts":
      return projection.is_private ? false : projection.publish_posts;
  }
}

export function orderedSections(order: readonly string[]): PortfolioSection[] {
  if (sectionOrderError(order)) return [...PORTFOLIO_SECTIONS];
  return order as PortfolioSection[];
}

export function publicIntro(identity: ProfileIdentity, projection: PublicPortfolioProjection | null) {
  if (!projection || !publicSectionVisible(projection, "intro")) {
    return { bio: null, goals: null, open_to: [] as string[], study_mode: null as string | null };
  }
  return {
    bio: identity.bio,
    goals: identity.goals,
    open_to: identity.open_to ?? [],
    study_mode: identity.study_mode ?? null,
  };
}

export function profileIntro(
  identity: ProfileIdentity,
  projection: PublicPortfolioProjection | null,
  mode: "owner" | "public"
) {
  if (mode === "owner") {
    return {
      bio: identity.bio,
      goals: identity.goals,
      open_to: identity.open_to ?? [],
      study_mode: identity.study_mode ?? null,
    };
  }
  return publicIntro(identity, projection);
}

export function metadataDescription(username: string): string {
  // Deliberately not the bio — unfurl caches keep text long after privacy flips.
  // Clarity when pasted in iMessage / LinkedIn / X: this is a portfolio link.
  return profileShareDescription(username);
}

export function assertNoDraftLeak(
  projects: Array<PublicPortfolioProject | Pick<PortfolioProject, "status" | "title">>
): string[] {
  return projects
    .filter((project) => "status" in project && project.status !== "published")
    .map((project) => project.title);
}

export function toPublicProject(row: {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  description: string | null;
  personal_role: string | null;
  technologies: string[];
  key_features: string[];
  repo_url: string | null;
  demo_url: string | null;
  published_at: string | null;
  sort_order: number;
}): PublicPortfolioProject | null {
  if (!row.published_at) return null;
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

export function ownerPreviewProjects(projects: PortfolioProject[]): PublicPortfolioProject[] {
  return projects
    .map((project) =>
      toPublicProject({
        id: project.id,
        owner_id: project.owner_id,
        title: project.title,
        summary: project.summary,
        description: project.description,
        personal_role: project.personalRole,
        technologies: project.technologies,
        key_features: project.keyFeatures,
        repo_url: project.repoUrl,
        demo_url: project.demoUrl,
        published_at: project.published_at,
        sort_order: project.sort_order,
      })
    )
    .filter((project): project is PublicPortfolioProject => project !== null);
}

export type PublicSectionPayload = {
  projects: PublicPortfolioProject[];
  experience: PublicPortfolioExperience[];
  education: PublicPortfolioEducation[];
};

export function emptyPublicSections(): PublicSectionPayload {
  return { projects: [], experience: [], education: [] };
}
