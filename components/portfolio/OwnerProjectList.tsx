"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { PortfolioProject } from "@/types/portfolio";
import { reorderProjectsAction } from "@/app/(app)/profile/projects/actions";
import ProjectCard from "./ProjectCard";
import GithubImportHint from "./GithubImportHint";

export default function OwnerProjectList({
  projects,
  previewPublic,
}: {
  projects: PortfolioProject[];
  previewPublic: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const visible = previewPublic ? projects.filter((project) => project.status === "published") : projects;

  function move(id: string, direction: -1 | 1) {
    const ids = projects.map((project) => project.id);
    const index = ids.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const reordered = [...ids];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(next, 0, removed);
    start(async () => {
      const result = await reorderProjectsAction(reordered);
      setError(result.error ?? null);
    });
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">Projects</h2>
        {!previewPublic && (
          <Link href="/profile/projects/new" className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm">
            <Plus strokeWidth={1.5} className="h-4 w-4" />
            Add project
          </Link>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <div className="card px-5 py-8 text-sm text-[var(--ink-muted)]">
          {previewPublic ? "No published projects." : "No projects yet. Add one to start your portfolio."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((project, index) => (
            <li key={project.id} className="flex flex-col gap-2">
              {!previewPublic && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    aria-label={`Move ${project.title} up`}
                    disabled={pending || index === 0}
                    onClick={() => move(project.id, -1)}
                  >
                    <ChevronUp strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    aria-label={`Move ${project.title} down`}
                    disabled={pending || index === visible.length - 1}
                    onClick={() => move(project.id, 1)}
                  >
                    <ChevronDown strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                </div>
              )}
              <ProjectCard project={project} isOwner={!previewPublic} />
            </li>
          ))}
        </ul>
      )}
      {!previewPublic && <GithubImportHint />}
    </section>
  );
}
