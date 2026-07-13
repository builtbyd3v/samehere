"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { rankJobs, type JobFitResult, type RankJobsState } from "./actions";

// "Find my matches": on-demand AI rerank of the active listing pool against the
// viewer's own profile + experience. Cached job_fit rows (passed in as
// initialResults, server-selected) render immediately with no AI call; the
// button re-runs ranking and spends quota (free 3/day, Pro 150/day).
export default function MatchesSection({
  initialResults,
  pro,
}: {
  initialResults: JobFitResult[];
  pro: boolean;
}) {
  const [state, setState] = useState<RankJobsState>({ results: initialResults });
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      setState(await rankJobs());
    });
  }

  const results = state.results ?? [];

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-[var(--ink)]">Find my matches</p>
          <p className="text-xs text-[var(--ink-muted)]">
            AI ranks listings against your profile.{pro ? " 150 a day on Pro." : " Free: 3 a day."}
          </p>
        </div>
        <button type="button" onClick={run} disabled={pending} className="btn-primary shrink-0">
          {pending ? "…" : "Find my matches"}
        </button>
      </div>

      {state.error && <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p>}

      {state.overCap && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm">
          <p className="text-[var(--ink)]">You&apos;ve used today&apos;s free matches.</p>
          <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
            Go Pro for 150 a day
          </Link>
        </div>
      )}

      {state.empty && (
        <p className="mt-3 text-sm text-[var(--ink-muted)]">No listings to match against yet.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((r) => (
            <li key={r.id} className="rounded-md border border-[var(--border)] px-3 py-2.5 text-sm">
              <p className="font-medium text-[var(--ink)]">
                {r.listing.title} <span className="font-normal text-[var(--ink-muted)]">· {r.listing.org}</span>
              </p>
              <p className="mt-0.5 text-[var(--ink-muted)]">{r.reason}</p>
              <a
                href={r.listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-medium text-[var(--blue)] underline"
              >
                Apply
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
