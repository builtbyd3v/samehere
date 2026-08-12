import type { CSSProperties } from "react";
import Link from "next/link";
import ModuleSection from "./ModuleSection";

export function ProjectPlanStub({
  projectTitle = "Campus events API",
  tasks = [
    { label: "Sketch the data model", done: true },
    { label: "Ship the read endpoints", done: false },
    { label: "Write the README story", done: false },
  ],
}: {
  projectTitle?: string;
  tasks?: { label: string; done: boolean }[];
}) {
  return (
    <ModuleSection id="project_plan">
      <p className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
        {projectTitle}
      </p>
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
      <Link
        href="/projects/url-shortener"
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

const DEFAULT_OPPORTUNITIES: OpportunityRow[] = [
  { org: "Stripe", title: "Software Engineering Intern", fit: "Strong fit" },
  { org: "Notion", title: "Product Engineering Intern", fit: "Good fit" },
];

export function OpportunitiesStub({
  listings,
}: {
  listings?: OpportunityRow[];
}) {
  const rows = listings?.length ? listings : DEFAULT_OPPORTUNITIES;

  return (
    <ModuleSection id="opportunities">
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
      <Link
        href="/jobs"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Browse opportunities
      </Link>
    </ModuleSection>
  );
}

const DEFAULT_STAGES = [
  { label: "Wishlist", count: 4 },
  { label: "Applied", count: 2 },
  { label: "Interview", count: 1 },
];

export function ApplicationsStub({
  stages,
}: {
  stages?: { label: string; count: number }[];
}) {
  const rows = stages ?? DEFAULT_STAGES;

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
  company = "Target company",
  prompt = "Tell me about a time you shipped under a deadline.",
}: {
  company?: string;
  prompt?: string;
}) {
  return (
    <ModuleSection id="interview_prep">
      <p className="text-xs font-medium text-[var(--accent-blue-strong)]">{company}</p>
      <p className="mt-2 text-base font-medium leading-snug text-[var(--ink)]">{prompt}</p>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">
        Write a short answer, then get feedback on structure and signal.
      </p>
      <Link
        href="/prep"
        className="mt-4 inline-flex text-sm font-medium text-[var(--accent-blue-strong)] hover:underline"
      >
        Open company practice banks
      </Link>
    </ModuleSection>
  );
}

export function HelpersStub({
  helpers = [
    { name: "Maya R.", org: "Stripe", note: "Open to intros" },
    { name: "Jordan K.", org: "Notion", note: "Same major" },
  ],
}: {
  helpers?: { name: string; org: string; note: string }[];
}) {
  return (
    <ModuleSection id="helpers">
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
  stage = "Foundations",
  next = "Finish one backend project checklist item",
}: {
  stage?: string;
  next?: string;
}) {
  return (
    <ModuleSection id="skill_stages">
      <p className="text-sm font-medium text-[var(--ink)]">Current stage · {stage}</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">Next checkpoint: {next}</p>
    </ModuleSection>
  );
}
