import Link from "next/link";
import { listInterviewBanks, PATH_PROJECTS } from "@/lib/path/seeds";

export default function PrepIndexPage() {
  const banks = listInterviewBanks();

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">Interview prep</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
          Company banks with process notes, approach guides, and an in-app answer box. Practice stays on samehere.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="companies-heading">
        <h2 id="companies-heading" className="text-lg font-semibold text-[var(--ink)]">
          Company banks
        </h2>
        <ul className="mt-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {banks.map((bank) => (
            <li key={bank.company_slug}>
              <Link
                href={`/prep/${bank.company_slug}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--featured-surface)]"
              >
                <span>
                  <span className="block font-medium text-[var(--ink)]">{bank.company_name}</span>
                  <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
                    {bank.questions.length} questions · {bank.process_summary.slice(0, 90)}…
                  </span>
                </span>
                <span className="text-sm text-[var(--ink-faint)]" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="projects-heading">
        <h2 id="projects-heading" className="text-lg font-semibold text-[var(--ink)]">
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
                className="block rounded-xl border border-[var(--border)] px-4 py-3 hover:border-[var(--border-strong)]"
              >
                <span className="font-medium text-[var(--ink)]">{p.title}</span>
                <span className="mt-1 block text-xs capitalize text-[var(--ink-muted)]">
                  {p.difficulty} · {p.time_hours[0]}–{p.time_hours[1]}h
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
