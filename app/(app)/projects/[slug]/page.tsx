import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, listProjectSlugs } from "@/lib/path/seeds";
import ProjectChecklist from "@/components/path/ProjectChecklist";

export function generateStaticParams() {
  return listProjectSlugs().map((slug) => ({ slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-[var(--ink-muted)]">
        <Link href="/prep" className="hover:text-[var(--ink)]">
          Prep
        </Link>
        <span className="mx-1.5">/</span>
        <span>Projects</span>
      </p>

      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">{project.title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">{project.interview_roi}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
          <span className="rounded-md border border-[var(--border)] px-2 py-1 capitalize">{project.difficulty}</span>
          <span className="rounded-md border border-[var(--border)] px-2 py-1">
            {project.time_hours[0]}–{project.time_hours[1]}h
          </span>
          <span className="rounded-md border border-[var(--border)] px-2 py-1">{project.domain}</span>
          {project.stack.map((s) => (
            <span key={s} className="rounded-md border border-[var(--border)] px-2 py-1">
              {s}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8">
        <ProjectChecklist projectSlug={project.slug} items={project.build_checklist} />
      </div>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">What you build</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_you_build.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">What it teaches</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_it_teaches.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--ink)]">How it works</h2>
        <ol className="mt-3 space-y-3">
          {project.how_it_works.map((step) => (
            <li key={step.step} className="rounded-lg border border-[var(--border)] px-4 py-3">
              <p className="text-sm font-medium text-[var(--ink)]">
                {step.step}. {step.title}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {project.take_it_further && project.take_it_further.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-[var(--ink)]">Take it further</h2>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">Secondary stretch goals — optional after the checklist.</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.take_it_further.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
