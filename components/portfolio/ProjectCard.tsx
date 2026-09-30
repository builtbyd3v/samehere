import { Pencil } from "lucide-react";
import type { PortfolioProject, PublicPortfolioProject } from "@/types/portfolio";
import { hasAnalysisSource } from "@/lib/portfolio/analysis-seam";
import { projectCoverClass } from "@/lib/portfolio/cover";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { HairlineCard } from "@/components/ui/HairlineCard";
import { MonoLabel } from "@/components/ui/MonoLabel";
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
  const year = project.published_at ? String(new Date(project.published_at).getUTCFullYear()) : null;

  return (
    <HairlineCard radius={20} lift className="h-full">
      <article className="flex h-full flex-col">
        <div aria-hidden className={`h-[110px] border-b border-[var(--hairline)] md:h-[150px] ${projectCoverClass(project.id)}`} />
        <div className="flex flex-1 flex-col gap-2 p-3.5 md:p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 text-balance text-base font-semibold tracking-[-0.01em] text-[var(--ink)] md:text-[17px]">
              {title}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {draft ? (
                <MonoLabel>Draft</MonoLabel>
              ) : year ? (
                <span className="font-mono text-[11px] tabular-nums text-[var(--faint)]">{year}</span>
              ) : null}
              {isOwner && isOwnerProject(project) && (
                <Button href={`/profile/projects/${project.id}/edit`} variant="ghost" size="sm">
                  <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  Edit
                </Button>
              )}
            </div>
          </div>
          {summary && <p className="text-pretty text-[13px] leading-[1.5] text-[var(--muted)] md:text-sm">{summary}</p>}
          {role && <p className="text-xs text-[var(--ink-3)]">{role}</p>}
          {technologies.length > 0 && (
            <ul aria-label="Technologies" className="mt-1 flex flex-wrap gap-[5px]">
              {technologies.map((t) => (
                <li key={t}>
                  <Chip tone="neutral">{t}</Chip>
                </li>
              ))}
            </ul>
          )}
          {(description || features.length > 0) && (
            <details className="mt-1">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[13px] text-[var(--muted)] hover:text-[var(--ink)] md:min-h-0 [&::-webkit-details-marker]:hidden">
                More
              </summary>
              {description && (
                <p className="mt-2 whitespace-pre-line break-words text-sm text-[var(--ink-2)]">{description}</p>
              )}
              {features.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
            </details>
          )}
          <div className="mt-1 flex flex-wrap gap-4 empty:hidden">
            <SafeHttpLink href={repo} track={trackClicks ? { projectId: project.id, clickKind: "repo" } : undefined}>
              Repository
            </SafeHttpLink>
            <SafeHttpLink href={demo} track={trackClicks ? { projectId: project.id, clickKind: "demo" } : undefined}>
              Demo
            </SafeHttpLink>
          </div>
          {sourced && (
            <p className="text-xs text-[var(--muted)]">
              Linked analysis stays a private reference. Manual edits are not overwritten.
            </p>
          )}
        </div>
      </article>
    </HairlineCard>
  );
}
