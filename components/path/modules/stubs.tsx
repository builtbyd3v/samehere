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
      <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
        {projectTitle}
      </p>
      <ol className="mt-4 space-y-2.5">
        {tasks.map((task) => (
          <li key={task.label} className="flex items-start gap-3 text-sm text-[var(--ink)]">
            <span
              aria-hidden
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                task.done
                  ? "border-[var(--blue)] bg-[var(--blue-glow)] text-[var(--blue)]"
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
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
            <span aria-hidden className="text-[var(--blue)]">
              ·
            </span>
            {gap}
          </li>
        ))}
      </ul>
      <Link
        href="/profile/edit"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {rows.map((listing) => {
          const href = listing.id ? `/jobs/${listing.id}` : "/jobs";
          const action = listing.id ? "Open" : "Browse";
          return (
            <li
              key={listing.id ?? `${listing.org}-${listing.title}`}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={href}
                  className="truncate text-sm font-semibold text-[var(--ink)] hover:underline"
                >
                  {listing.title}
                </Link>
                <p className="text-sm text-[var(--ink-muted)]">
                  {listing.org}
                  {listing.location
                    ? ` · ${listing.location.slice(0, 60)}`
                    : ""}
                </p>
                {listing.fit ? (
                  <p className="mt-0.5 text-xs text-[var(--blue)]">{listing.fit}</p>
                ) : null}
              </div>
              <Link
                href={href}
                className="shrink-0 text-xs font-semibold text-[var(--blue)] hover:underline"
              >
                {action}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/jobs"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
      <div className="flex flex-wrap gap-6">
        {rows.map((stage) => (
          <div key={stage.label}>
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-[var(--ink)]">
              {stage.count}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {stage.label}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/applications"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--blue)]">
        {company}
      </p>
      <p className="mt-2 text-base font-medium leading-snug text-[var(--ink)]">{prompt}</p>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">
        Write a short answer, then get feedback on structure and signal.
      </p>
      <Link
        href="/prep"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
              <p className="font-semibold text-[var(--ink)]">{helper.name}</p>
              <p className="text-[var(--ink-muted)]">{helper.org}</p>
            </div>
            <span className="text-xs text-[var(--ink-muted)]">{helper.note}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/messages"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
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
      <p className="text-sm font-semibold text-[var(--ink)]">Current stage · {stage}</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">Next checkpoint: {next}</p>
    </ModuleSection>
  );
}
