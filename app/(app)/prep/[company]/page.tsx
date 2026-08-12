import Link from "next/link";
import { notFound } from "next/navigation";
import { getInterviewBank, listInterviewBanks } from "@/lib/path/seeds";
import InterviewAnswerBox from "@/components/path/InterviewAnswerBox";
import type { InterviewQuestionType } from "@/lib/path/types";

export function generateStaticParams() {
  return listInterviewBanks().map((b) => ({ company: b.company_slug }));
}

const TYPE_LABEL: Record<InterviewQuestionType, string> = {
  coding: "Coding",
  system_design: "System design",
  behavioral: "Behavioral",
  role_fit: "Role fit",
};

export default async function PrepCompanyPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  const bank = getInterviewBank(company);
  if (!bank) notFound();

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-[var(--ink-muted)]">
        <Link href="/prep" className="hover:text-[var(--ink)]">
          Prep
        </Link>
        <span className="mx-1.5">/</span>
        <span>{bank.company_name}</span>
      </p>

      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">{bank.company_name}</h1>
        <p className="mt-3 text-[var(--ink-muted)]">{bank.process_summary}</p>
      </header>

      <ol className="mt-8 space-y-6">
        {bank.questions.map((q, i) => (
          <li key={q.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
              <span className="rounded-md border border-[var(--border)] px-2 py-0.5">{TYPE_LABEL[q.type]}</span>
              <span className="rounded-md border border-[var(--border)] px-2 py-0.5 capitalize">{q.difficulty}</span>
              <span className="text-[var(--ink-faint)]">Q{i + 1}</span>
            </div>
            <p className="mt-3 text-base font-medium text-[var(--ink)]">{q.prompt}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--featured-surface)] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Approach</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{q.approach}</p>
              </div>
              <div className="rounded-lg bg-[var(--featured-surface)] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                  What they&apos;re evaluating
                </p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{q.evaluating}</p>
              </div>
            </div>

            <InterviewAnswerBox companySlug={bank.company_slug} questionId={q.id} />
          </li>
        ))}
      </ol>
    </main>
  );
}
