"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Skeleton } from "@/components/ui/Skeleton";
import { rankJobs, type JobFitResult, type RankJobsState } from "./actions";

export default function MatchesSection({
  initialResults,
  pro,
}: {
  initialResults: JobFitResult[];
  pro: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<RankJobsState>({ results: initialResults });
  const [hasRun, setHasRun] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const next = await rankJobs();
      setState(next);
      setHasRun(true);
      posthog.capture("job_fit_ranked", {
        outcome: next.overCap ? "over_cap" : next.error ? "error" : "results",
        result_count: next.results?.length ?? 0,
      });
      if (next.results?.length) router.refresh();
    });
  }

  const results = state.results ?? [];
  const noMatches = hasRun && !pending && !state.error && !state.overCap && !state.empty && results.length === 0;
  const visibleResults = expanded ? results : results.slice(0, 3);

  return (
    <section
      className="app-panel flex flex-col p-4 lg:max-h-[calc(100dvh-64px-1rem)] lg:overflow-hidden"
      aria-labelledby="fit-assistant-title"
    >
      <div className="shrink-0">
        <p id="fit-assistant-title" className="text-sm font-medium text-[var(--ink)]">
          AI fit assistant
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
          Rank current listings against your profile. Fit reasons also appear on the listing rows.
        </p>

        <button type="button" onClick={run} disabled={pending} className="btn-primary mt-4 w-full">
          {pending ? "Analyzing..." : results.length ? "Refresh analysis" : "Analyze my fit"}
        </button>
        <p className="mt-2 text-center text-[11px] text-[var(--ink-faint)]">
          {pro ? "150 analyses per day on Pro" : "3 analyses per day on Free"}
        </p>

        {state.error && <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p>}

        {state.overCap && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm">
            <p className="text-[var(--ink)]">You&apos;ve used today&apos;s free matches.</p>
            <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
              Go Pro for 150 a day
            </Link>
          </div>
        )}

        {state.empty && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">No listings to match against yet.</p>
        )}

        {noMatches && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            No strong matches yet. Add your major, target role, and experience so the analysis has more signal.
          </p>
        )}

        {pending && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}
      </div>

      {!pending && results.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-[var(--border)] pt-3">
          <p className="shrink-0 text-[11px] font-medium text-[var(--ink-faint)]">
            {results.length} ranked match{results.length === 1 ? "" : "es"}
          </p>
          <ul
            className="app-panel-scroll mt-2 min-h-0 space-y-3 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
            aria-label="Ranked match results"
          >
            {visibleResults.map((result) => (
              <li key={result.id}>
                <Link
                  href={`/jobs/${result.listing.id}`}
                  className="text-sm font-medium leading-snug text-[var(--ink)] hover:underline"
                >
                  {result.listing.title}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{result.listing.org}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--ink-faint)]">
                  {result.reason}
                </p>
              </li>
            ))}
          </ul>
          {results.length > 3 ? (
            <button
              type="button"
              className="mt-3 shrink-0 text-xs font-medium text-[var(--accent-blue-strong)]"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Show fewer" : `Show all ${results.length}`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
