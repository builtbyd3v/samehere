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

export function OpportunitiesStub({
  listings = [
    { org: "Stripe", title: "Software Engineering Intern", fit: "Strong fit" },
    { org: "Notion", title: "Product Engineering Intern", fit: "Good fit" },
  ],
}: {
  listings?: { org: string; title: string; fit: string }[];
}) {
  return (
    <ModuleSection id="opportunities">
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {listings.map((listing) => (
          <li key={`${listing.org}-${listing.title}`} className="flex items-baseline justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{listing.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">{listing.org}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--blue)]">{listing.fit}</span>
          </li>
        ))}
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

export function ApplicationsStub({
  stages = [
    { label: "Wishlist", count: 4 },
    { label: "Applied", count: 2 },
    { label: "Interview", count: 1 },
  ],
}: {
  stages?: { label: string; count: number }[];
}) {
  return (
    <ModuleSection id="applications">
      <div className="flex flex-wrap gap-6">
        {stages.map((stage) => (
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

export function PitchStub() {
  return (
    <ModuleSection id="pitch">
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        Generate resume bullets tailored to one listing when you are ready to apply.
      </p>
      <Link
        href="/jobs"
        className="mt-4 inline-flex text-sm font-semibold text-[var(--blue)] hover:underline"
      >
        Pick a listing to pitch
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
