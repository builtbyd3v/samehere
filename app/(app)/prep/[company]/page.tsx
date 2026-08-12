import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AppEmptyState,
  AppNotice,
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import InterviewAnswerBox from "@/components/path/InterviewAnswerBox";
import { getInterviewBank, listInterviewBanks } from "@/lib/path/seeds";
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

export default async function PrepCompanyPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const bank = getInterviewBank(company);
  if (!bank) notFound();

  const firstQuestion = bank.questions[0];

  return (
    <AppPage width="wide">
      <p className="mb-3 text-xs font-medium tracking-[0.08em] text-[var(--accent-blue-strong)]">
        <Link href="/prep" className="hover:text-[var(--ink)]">
          All company banks
        </Link>
        <span className="mx-1.5 text-[var(--ink-faint)]">/</span>
        <span className="text-[var(--ink-muted)]">{bank.company_name}</span>
      </p>

      <AppPageHeader
        kicker="Prep"
        title={bank.company_name}
        description="Practice one answer at a time. Feedback stays on the page so you can tighten structure before the real loop."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="btn-ghost inline-flex">
              Back to path
            </Link>
            {firstQuestion ? (
              <a href={`#q-${firstQuestion.id}`} className="btn-primary inline-flex">
                Start first question
              </a>
            ) : null}
          </div>
        }
      />

      <AppNotice tone="accent">{bank.process_summary}</AppNotice>

      {bank.questions.length === 0 ? (
        <div className="mt-6">
          <AppEmptyState
            title="No questions in this bank"
            description="Pick another company or return to your path while we fill this pack."
            action={
              <Link href="/prep" className="btn-primary inline-flex">
                Browse company banks
              </Link>
            }
          />
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {bank.questions.map((q, i) => (
            <li key={q.id} id={`q-${q.id}`}>
              <AppPanel className="landing-xai-card-hover p-5 sm:p-6">
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
              </AppPanel>
            </li>
          ))}
        </ol>
      )}
    </AppPage>
  );
}
