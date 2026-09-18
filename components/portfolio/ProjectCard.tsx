import Link from "next/link";
import { Pencil } from "lucide-react";
import type { PortfolioProject, PublicPortfolioProject } from "@/types/portfolio";
import { hasAnalysisSource } from "@/lib/portfolio/analysis-seam";
import SafeHttpLink from "./SafeHttpLink";

type CardProject = PublicPortfolioProject | PortfolioProject;

function isOwnerProject(project: CardProject): project is PortfolioProject {
  return "status" in project;
}

export default function ProjectCard({
  project,
  isOwner = false,
  trackClicks = false,
}: {
  project: CardProject;
  isOwner?: boolean;
  trackClicks?: boolean;
}) {
  const title = project.title;
  const summary = isOwnerProject(project) ? project.summary : project.summary;
  const description = isOwnerProject(project) ? project.description : project.description;
  const role = isOwnerProject(project) ? project.personalRole : project.personal_role;
  const technologies = isOwnerProject(project) ? project.technologies : project.technologies;
  const features = isOwnerProject(project) ? project.keyFeatures : project.key_features;
  const repo = isOwnerProject(project) ? project.repoUrl : project.repo_url;
  const demo = isOwnerProject(project) ? project.demoUrl : project.demo_url;
  const draft = isOwner && isOwnerProject(project) && project.status !== "published";
  const sourced = isOwner && isOwnerProject(project) && hasAnalysisSource(project);

  return (
    <article className="card-raised card-hover-raise p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]">{title}</h3>
          {draft && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-faint)]">Draft</p>
          )}
        </div>
        {isOwner && isOwnerProject(project) && (
          <Link
            href={`/profile/projects/${project.id}/edit`}
            className="btn-ghost inline-flex shrink-0 items-center gap-1 !px-3 !py-1.5 text-sm"
          >
            <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
            Edit
          </Link>
        )}
      </div>
      {summary && <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{summary}</p>}
      {role && (
        <p className="mt-2 text-sm text-[var(--ink)]">
          <span className="text-[var(--ink-muted)]">Role </span>
          {role}
        </p>
      )}
      {description && (
        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-6 text-[var(--ink)]">{description}</p>
      )}
      {technologies.length > 0 && (
        <p className="mt-3 text-[12px] font-medium tracking-[0.01em] text-[var(--ink-muted)]">
          {technologies.join(" · ")}
        </p>
      )}
      {features.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm text-[var(--ink-muted)]">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-4">
        <SafeHttpLink href={repo} track={trackClicks ? { projectId: project.id, clickKind: "repo" } : undefined}>
          Repository
        </SafeHttpLink>
        <SafeHttpLink href={demo} track={trackClicks ? { projectId: project.id, clickKind: "demo" } : undefined}>
          Demo
        </SafeHttpLink>
      </div>
      {sourced && (
        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          Linked analysis stays a private reference. Manual edits are not overwritten.
        </p>
      )}
    </article>
  );
}
