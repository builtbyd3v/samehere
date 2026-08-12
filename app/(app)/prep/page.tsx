import Link from "next/link";
import {
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import { listInterviewBanks } from "@/lib/path/seeds";

export const metadata = { title: "Interview prep · samehere" };

export default function PrepIndexPage() {
  const banks = listInterviewBanks();
  const first = banks[0];

  return (
    <AppPage width="wide">
      <AppPageHeader
        kicker="Prep"
        title="Company interview practice"
        description="Pick a company bank. Process notes, approach guides, and an in-app answer box stay on samehere."
        action={
          <Link href="/home" className="btn-ghost inline-flex">
            Back to path
          </Link>
        }
      />

      {banks.length === 0 ? (
        <AppEmptyState
          title="No company banks yet"
          description="Interview practice packs will show up here when your path needs them."
          action={
            <Link href="/home" className="btn-primary inline-flex">
              Back to path
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="companies-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="companies-heading"
                className="text-lg font-medium tracking-[-0.02em] text-[var(--ink)]"
              >
                Company banks
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {banks.length} companies ready for focused practice.
              </p>
            </div>
            {first ? (
              <Link href={`/prep/${first.company_slug}`} className="btn-primary inline-flex">
                Start with {first.company_name}
              </Link>
            ) : null}
          </div>

          <AppPanel as="div" className="overflow-hidden">
            <ul className="divide-y divide-[var(--border)]">
              {banks.map((bank) => (
                <li key={bank.company_slug}>
                  <Link
                    href={`/prep/${bank.company_slug}`}
                    className="landing-xai-card-hover flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <span className="landing-xai-card-content min-w-0">
                      <span className="block font-medium text-[var(--ink)]">
                        {bank.company_name}
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
                        {bank.questions.length} questions ·{" "}
                        {bank.process_summary.slice(0, 90)}
                        {bank.process_summary.length > 90 ? "…" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-[var(--ink-faint)]" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </AppPanel>
        </section>
      )}
    </AppPage>
  );
}
