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
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-blue-strong)]">
        <Link href="/prep" className="hover:text-[var(--ink)]">
          Prep
        </Link>
        <span className="mx-1.5 text-[var(--ink-faint)]">/</span>
        <span className="text-[var(--ink-muted)]">{bank.company_name}</span>
      </p>

      <header className="mt-3">
        <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--ink)] md:text-[2.5rem]">
          {bank.company_name}
        </h1>
        <p className="mt-3 rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--ink-muted)]">
          {bank.process_summary}
        </p>
      </header>

      <ol className="mt-8 space-y-4">
        {bank.questions.map((q, i) => (
          <li
            key={q.id}
            className="landing-xai-card-hover rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="landing-xai-card-content">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                <span className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-0.5">
                  {TYPE_LABEL[q.type]}
                </span>
                <span className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-2 py-0.5 capitalize">
                  {q.difficulty}
                </span>
                <span className="text-[var(--accent-blue-strong)]">Q{i + 1}</span>
              </div>
              <p className="mt-3 text-base font-medium tracking-[-0.015em] text-[var(--ink)]">
                {q.prompt}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-blue-strong)]">
                    Approach
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{q.approach}</p>
                </div>
                <div className="rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-blue-strong)]">
                    What they&apos;re evaluating
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{q.evaluating}</p>
                </div>
              </div>

              <InterviewAnswerBox companySlug={bank.company_slug} questionId={q.id} />
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
