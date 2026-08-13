import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AppNotice,
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import ProjectChecklist from "@/components/path/ProjectChecklist";
import { ProjectStudio } from "@/components/path/studio";
import { getStudioManifest } from "@/lib/path/studio";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, listProjectSlugs } from "@/lib/path/seeds";
import { draftDossierFromProject, matchesProjectExperience } from "@/lib/path/dossier-draft";
import { getProjectWorkspace, getUserProjectState } from "../actions";

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
  const draft = draftDossierFromProject(project);

  let inDossier = false;
  if (user) {
    const { data: experiences } = await supabase
      .from("experiences")
      .select("kind, role")
      .eq("user_id", user.id)
      .eq("kind", draft.kind);
    inDossier = (experiences ?? []).some((row) => matchesProjectExperience(row, project.title));
  }

  const manifest = getStudioManifest(project.slug);
  const workspaceSnapshot = user ? await getProjectWorkspace(project.slug) : null;

  if (manifest) {
    return (
      <AppPage width="canvas" className="project-studio-page">
        <ProjectStudio
          project={project}
          manifest={manifest}
          signedIn={!!user}
          initialDone={initialDone}
          dossierDraft={draft}
          inDossier={inDossier}
          workspaceSnapshot={workspaceSnapshot}
        />
      </AppPage>
    );
  }

  return (
    <AppPage width="wide">
      <AppPageHeader
        kicker="Project"
        title={project.title}
        description={project.interview_roi}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="btn-ghost inline-flex">
              Back to path
            </Link>
            <a href="#build-checklist" className="btn-primary inline-flex">
              Continue checklist
            </a>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
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

      {!user ? (
        <div className="mb-4">
          <AppNotice>
            Sign in to sync checklist progress across devices. Local progress still saves in this
            browser.
          </AppNotice>
        </div>
      ) : null}

      <div id="build-checklist">
        <ProjectChecklist
          projectSlug={project.slug}
          items={project.build_checklist}
          initialDone={initialDone}
          persistServer={!!user}
          dossierDraft={draft}
          inDossier={inDossier}
        />
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Project outcomes">
        <AppPanel className="p-5">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
            What you build
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_you_build.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AppPanel>
        <AppPanel className="p-5">
          <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
            What it teaches
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
            {project.what_it_teaches.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AppPanel>
      </section>

      <section className="mt-8" aria-labelledby="how-it-works-heading">
        <h2
          id="how-it-works-heading"
          className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]"
        >
          How it works
        </h2>
        <ol className="mt-3 space-y-3">
          {project.how_it_works.map((step) => (
            <li key={step.step}>
              <AppPanel className="px-4 py-3">
                <p className="text-sm font-medium text-[var(--ink)]">
                  <span className="text-[var(--accent-blue-strong)]">{step.step}.</span>{" "}
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{step.detail}</p>
              </AppPanel>
            </li>
          ))}
        </ol>
      </section>

      {project.take_it_further && project.take_it_further.length > 0 ? (
        <section className="mt-8" aria-labelledby="further-heading">
          <h2
            id="further-heading"
            className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]"
          >
            Take it further
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">
            Optional stretch goals after the checklist.
          </p>
          <AppPanel className="mt-3 p-5">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--ink-muted)]">
              {project.take_it_further.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </AppPanel>
        </section>
      ) : null}
    </AppPage>
  );
}
