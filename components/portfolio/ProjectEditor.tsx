"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { PORTFOLIO_LIMITS } from "@/lib/portfolio/validation";
import { hasAnalysisSource } from "@/lib/portfolio/analysis-seam";
import type { PortfolioProject } from "@/types/portfolio";
import {
  createProjectAction,
  deleteProjectAction,
  saveAndPublishProjectAction,
  unpublishProjectAction,
  updateProjectAction,
  type ProjectActionState,
} from "@/app/(app)/profile/projects/actions";

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";
const hint = "mt-1 text-xs text-[var(--ink-muted)]";

export default function ProjectEditor({
  project,
  username,
  beforeForm,
}: {
  project: PortfolioProject | null;
  username: string;
  beforeForm?: ReactNode;
}) {
  const isNew = project === null;
  const boundUpdate = updateProjectAction.bind(null, project?.id ?? "");
  const boundPublish = saveAndPublishProjectAction.bind(null, project?.id ?? "");
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(
    isNew ? createProjectAction : boundUpdate,
    {}
  );
  const [publishState, publishAction, publishPending] = useActionState<ProjectActionState, FormData>(
    boundPublish,
    {}
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [busy, start] = useTransition();
  const error = state.error ?? publishState.error ?? actionError;

  function run(fn: () => Promise<ProjectActionState>) {
    start(async () => {
      const result = await fn();
      setActionError(result.error ?? null);
    });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{isNew ? "New project" : "Edit project"}</h1>
        <Link href={`/profile/${username}`} className="text-sm text-[var(--ink-muted)] underline">
          Back to profile
        </Link>
      </div>

      {beforeForm}

      <form action={formAction} className="card p-5 sm:p-6">
        {error && (
          <p role="alert" className="mb-4 rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="title" className={label}>
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={PORTFOLIO_LIMITS.title}
              defaultValue={project?.title ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="summary" className={label}>
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={2}
              maxLength={PORTFOLIO_LIMITS.summary}
              defaultValue={project?.summary ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="description" className={label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              maxLength={PORTFOLIO_LIMITS.description}
              defaultValue={project?.description ?? ""}
              className={field}
            />
            <p className={hint}>Plain text only.</p>
          </div>
          <div>
            <label htmlFor="personalRole" className={label}>
              Personal role
            </label>
            <textarea
              id="personalRole"
              name="personalRole"
              rows={3}
              maxLength={PORTFOLIO_LIMITS.personalRole}
              defaultValue={project?.personalRole ?? ""}
              className={field}
            />
            <p className={hint}>Required before publishing. Describe your work, not the whole repo.</p>
          </div>
          <div>
            <label htmlFor="technologies" className={label}>
              Technologies
            </label>
            <input
              id="technologies"
              name="technologies"
              defaultValue={project?.technologies.join(", ") ?? ""}
              className={field}
            />
            <p className={hint}>Comma-separated. At most {PORTFOLIO_LIMITS.technologies}.</p>
          </div>
          <div>
            <label htmlFor="keyFeatures" className={label}>
              Key features
            </label>
            <textarea
              id="keyFeatures"
              name="keyFeatures"
              rows={4}
              defaultValue={project?.keyFeatures.join("\n") ?? ""}
              className={field}
            />
            <p className={hint}>One per line. At most {PORTFOLIO_LIMITS.keyFeatures}.</p>
          </div>
          <div>
            <label htmlFor="repoUrl" className={label}>
              Repository URL
            </label>
            <input id="repoUrl" name="repoUrl" type="url" defaultValue={project?.repoUrl ?? ""} className={field} />
          </div>
          <div>
            <label htmlFor="demoUrl" className={label}>
              Demo URL
            </label>
            <input id="demoUrl" name="demoUrl" type="url" defaultValue={project?.demoUrl ?? ""} className={field} />
          </div>
        </div>

        {project && hasAnalysisSource(project) && (
          <p className="mt-5 text-sm text-[var(--ink-faint)]">
            Linked to a GitHub repository. Saving here keeps the write-up you enter.
          </p>
        )}

        <button type="submit" disabled={pending || publishPending} className="btn-primary mt-6 w-full">
          {pending ? "Saving…" : isNew ? "Save draft" : "Save"}
        </button>

        {project?.status === "draft" && (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <label className="flex items-start gap-2.5 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                name="roleConfirmed"
                value="true"
                checked={roleConfirmed}
                onChange={(event) => setRoleConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--ink)]"
              />
              I confirm the personal role describes my work on this project.
            </label>
            <p className={hint}>Publishing saves the text on this page first.</p>
            <button
              type="submit"
              formAction={publishAction}
              disabled={pending || publishPending || !roleConfirmed}
              className="btn-primary mt-4 w-full"
            >
              {publishPending ? "Publishing…" : "Save and publish"}
            </button>
          </div>
        )}
      </form>

      {project && (
        <div className="mt-4 flex flex-col gap-3">
          {project.status === "published" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => unpublishProjectAction(project.id))}
              className="btn-ghost w-full"
            >
              Unpublish
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Delete this project? This cannot be undone.")) {
                run(() => deleteProjectAction(project.id));
              }
            }}
            className="btn-ghost w-full text-[var(--danger)]"
          >
            Delete
          </button>
        </div>
      )}
    </main>
  );
}
