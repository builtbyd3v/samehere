import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, listProjectSlugs } from "@/lib/path/seeds";
import ProjectChecklist from "@/components/path/ProjectChecklist";
import { getUserProjectState } from "../actions";

export function generateStaticParams() {
  return listProjectSlugs().map((slug) => ({ slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialDone = user ? ((await getUserProjectState(project.slug)) ?? {}) : undefined;

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-blue-strong)]">
        <Link href="/home" className="hover:text-[var(--ink)]">
          Home
        </Link>
        <span className="mx-1.5 text-[var(--ink-faint)]">/</span>
        <span className="text-[var(--ink-muted)]">Projects</span>
      </p>

      <header className="mt-3">
        <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--ink)] md:text-[2.5rem]">
          {project.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">{project.interview_roi}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
          <span className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-1 capitalize">
            {project.difficulty}
          </span>
          <span className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-1">
            {project.time_hours[0]}–{project.time_hours[1]}h
          </span>
          <span className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-1">
            {project.domain}
          </span>
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-1"
            >
              {s}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8">
        <ProjectChecklist
          projectSlug={project.slug}
          items={project.build_checklist}
          initialDone={initialDone}
          persistServer={!!user}
        />
      </div>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">What you build</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_you_build.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">What it teaches</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_it_teaches.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">How it works</h2>
        <ol className="mt-3 space-y-3">
          {project.how_it_works.map((step) => (
            <li
              key={step.step}
              className="rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <p className="text-sm font-medium text-[var(--ink)]">
                <span className="text-[var(--accent-blue-strong)]">{step.step}.</span> {step.title}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {project.take_it_further && project.take_it_further.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">Take it further</h2>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">
            Secondary stretch goals — optional after the checklist.
          </p>
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
