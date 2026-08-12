import Link from "next/link";
import { listInterviewBanks, PATH_PROJECTS } from "@/lib/path/seeds";

export default function PrepIndexPage() {
  const banks = listInterviewBanks();

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-blue-strong)]">
          Prep
        </p>
        <h1 className="mt-2 text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--ink)] md:text-[2.5rem]">
          Interview prep
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          Company banks with process notes, approach guides, and an in-app answer box. Practice stays
          on samehere.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="companies-heading">
        <h2
          id="companies-heading"
          className="text-lg font-medium tracking-[-0.02em] text-[var(--ink)]"
        >
          Company banks
        </h2>
        <ul className="mt-4 flex flex-col gap-2">
          {banks.map((bank) => (
            <li key={bank.company_slug}>
              <Link
                href={`/prep/${bank.company_slug}`}
                className="landing-xai-card-hover flex items-center justify-between gap-3 rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"
              >
                <span className="landing-xai-card-content min-w-0">
                  <span className="block font-medium text-[var(--ink)]">{bank.company_name}</span>
                  <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
                    {bank.questions.length} questions · {bank.process_summary.slice(0, 90)}…
                  </span>
                </span>
                <span className="shrink-0 text-sm text-[var(--ink-faint)]" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="projects-heading">
        <h2
          id="projects-heading"
          className="text-lg font-medium tracking-[-0.02em] text-[var(--ink)]"
        >
          Native projects
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Build in-app with checklists — assigned by your path, also browsable here.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {PATH_PROJECTS.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/projects/${p.slug}`}
                className="landing-xai-card-hover block rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="landing-xai-card-content">
                  <span className="font-medium text-[var(--ink)]">{p.title}</span>
                  <span className="mt-1 block text-xs capitalize text-[var(--ink-muted)]">
                    {p.difficulty} · {p.time_hours[0]}–{p.time_hours[1]}h
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
