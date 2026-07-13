"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { rankJobs, type JobFitResult, type RankJobsState } from "./actions";

// "FIT" pill — same motif as landing's AiTag (components/landing/AiTag.tsx),
// copied rather than imported since landing components are read-only here.
function FitTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--blue-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--blue)]">
      <svg aria-hidden viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
        <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" />
      </svg>
      Fit
    </span>
  );
}

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
  const [hasRun, setHasRun] = useState(false);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  function run() {
    startTransition(async () => {
      const next = await rankJobs();
      setState(next);
      setHasRun(true);
    });
  }

  const results = state.results ?? [];
  const noMatches = hasRun && !pending && !state.error && !state.overCap && !state.empty && results.length === 0;

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
          Find my matches
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

      {noMatches && (
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          No strong matches yet. Add your major, goals, and experiences to your profile so the AI has more to work with.
        </p>
      )}

      {pending && (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      )}

      {!pending && results.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((r, i) => (
            <motion.li
              key={r.id}
              className="rounded-md border border-[var(--border)] px-3 py-2.5 text-sm"
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.06 * i }}
            >
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FitTag />
                    <p className="font-medium text-[var(--ink)]">
                      <Link href={`/jobs/${r.listing.id}`} className="hover:underline">
                        {r.listing.title}
                      </Link>{" "}
                      <span className="font-normal text-[var(--ink-muted)]">· {r.listing.org}</span>
                    </p>
                  </div>
                  <p className="mt-1 text-[var(--ink-muted)]">{r.reason}</p>
                </div>
                <a
                  href={r.listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 self-start rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:opacity-80"
                >
                  Apply
                </a>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
