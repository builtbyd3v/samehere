import type { CSSProperties } from "react";
import Link from "next/link";
import ModuleSection from "./ModuleSection";

export function ProjectPlanStub({
  projectTitle,
  projectSlug,
  checked = 0,
  total = 0,
  tasks = [],
}: {
  projectTitle?: string | null;
  projectSlug?: string | null;
  checked?: number;
  total?: number;
  tasks?: { label: string; done: boolean }[];
}) {
  if (!projectTitle || !projectSlug) {
    return (
      <ModuleSection id="project_plan">
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          Your next project will appear here after the path intake.
        </p>
      </ModuleSection>
    );
  }

  return (
    <ModuleSection id="project_plan">
      <p className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
        {projectTitle}
      </p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {checked} of {total} required checkpoints complete
      </p>
      {tasks.length ? (
        <ol className="mt-4 space-y-2.5">
          {tasks.map((task) => (
            <li key={task.label} className="flex items-start gap-3 text-sm text-[var(--ink)]">
              <span
                aria-hidden
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                  task.done
                    ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue-strong)]"
                    : "border-[var(--border-strong)] text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={task.done ? "text-[var(--ink-muted)] line-through" : undefined}>
                {task.label}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <Link
        href={`/projects/${projectSlug}`}
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Open project workspace
      </Link>
    </ModuleSection>
  );
}

export function DossierStub({
  gaps = ["Add one project with outcomes", "Link GitHub or portfolio"],
}: {
  gaps?: string[];
}) {
  return (
    <ModuleSection id="dossier">
      <ul className="space-y-2 text-sm text-[var(--ink)]">
        {gaps.map((gap) => (
          <li key={gap} className="flex gap-2">
            <span aria-hidden className="text-[var(--accent-blue-strong)]">
              ·
            </span>
            {gap}
          </li>
        ))}
      </ul>
      <Link
        href="/profile/edit"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Update dossier
      </Link>
    </ModuleSection>
  );
}

export type OpportunityRow = {
  id?: string;
  org: string;
  title: string;
  location?: string | null;
  fit?: string | null;
};

export function OpportunitiesStub({
  listings,
}: {
  listings?: OpportunityRow[];
}) {
  const rows = listings ?? [];

  return (
    <ModuleSection id="opportunities">
      {rows.length ? (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((listing) => {
          const href = listing.id ? `/jobs/${listing.id}` : "/jobs";
          const action = listing.id ? "Open" : "Browse";
          return (
            <li
              key={listing.id ?? `${listing.org}-${listing.title}`}
              className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  href={href}
                  className="truncate text-sm font-medium text-[var(--ink)] hover:underline"
                >
                  {listing.title}
                </Link>
                <p className="landing-opportunity-org">
                  {listing.org}
                  {listing.location
                    ? ` · ${listing.location.slice(0, 60)}`
                    : ""}
                </p>
                {listing.fit ? (
                  <span className="landing-fit mt-1.5 inline-flex">{listing.fit}</span>
                ) : null}
              </div>
              <Link
                href={href}
                className="shrink-0 text-xs font-medium text-[var(--accent-blue-strong)] hover:underline"
              >
                {action}
              </Link>
            </li>
          );
          })}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          No matched opportunities yet. Browse the board to set your first target.
        </p>
      )}
      <Link
        href="/jobs"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Browse opportunities
      </Link>
    </ModuleSection>
  );
}

export function ApplicationsStub({
  stages,
}: {
  stages?: { label: string; count: number }[];
}) {
  const rows = stages ?? [
    { label: "Wishlist", count: 0 },
    { label: "Applied", count: 0 },
    { label: "Interview", count: 0 },
  ];

  return (
    <ModuleSection id="applications">
      <div className="landing-pipeline" aria-label="Application stages">
        {rows.map((stage, index) => (
          <div key={stage.label} className="landing-pipeline-stage">
            <span
              aria-hidden
              className="landing-pipeline-dot path-pipeline-dot"
              style={{ "--stage-index": index } as CSSProperties}
              data-count={stage.count}
            />
            <div>
              <p className="text-lg font-medium tabular-nums tracking-[-0.03em] text-[var(--ink)]">
                {stage.count}
              </p>
              <p className="text-[0.75rem] text-[var(--ink-faint)]">{stage.label}</p>
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/applications"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Open tracker
      </Link>
    </ModuleSection>
  );
}

export function PitchStub({ listingId }: { listingId?: string }) {
  const href = listingId ? `/jobs/${listingId}` : "/jobs";
  return (
    <ModuleSection id="pitch">
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        Generate resume bullets tailored to one listing when you are ready to apply.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        {listingId ? "Pitch this listing" : "Pick a listing to pitch"}
      </Link>
    </ModuleSection>
  );
}

export function InterviewPrepStub({
  company,
  prompt,
  href = "/prep",
}: {
  company?: string | null;
  prompt?: string | null;
  href?: string;
}) {
  return (
    <ModuleSection id="interview_prep">
      <p className="text-xs font-medium text-[var(--accent-blue-strong)]">
        {company ?? "Company practice"}
      </p>
      <p className="mt-2 text-base font-medium leading-snug text-[var(--ink)]">
        {prompt ?? "Pick a company bank and start one practice answer."}
      </p>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">
        Write a short answer, then get feedback on structure and signal.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        {company ? `Practice for ${company}` : "Open company practice"}
      </Link>
    </ModuleSection>
  );
}

export function HelpersStub({
  helpers = [],
}: {
  helpers?: { name: string; org: string; note: string }[];
}) {
  return (
    <ModuleSection id="helpers">
      {helpers.length ? (
        <ul className="space-y-3">
          {helpers.map((helper) => (
            <li key={helper.name} className="flex items-baseline justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-[var(--ink)]">{helper.name}</p>
                <p className="text-[var(--ink-muted)]">{helper.org}</p>
              </div>
              <span className="landing-fit">{helper.note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          Helpers appear on opportunities when someone at that company opts in.
        </p>
      )}
      <Link
        href="/messages"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Draft an icebreaker
      </Link>
    </ModuleSection>
  );
}

export function SkillStagesStub({
  track,
  stage,
  description,
  next,
}: {
  track?: string | null;
  stage?: string | null;
  description?: string | null;
  next?: string | null;
}) {
  return (
    <ModuleSection id="skill_stages">
      {stage ? (
        <>
          {track ? <p className="text-xs text-[var(--ink-faint)]">{track}</p> : null}
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">{stage}</p>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{description}</p>
          ) : null}
          {next ? (
            <p className="mt-3 text-sm text-[var(--ink)]">
              Next skill: <span className="text-[var(--ink-muted)]">{next}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          Your current skill stage will appear after diagnosis.
        </p>
      )}
    </ModuleSection>
  );
}
