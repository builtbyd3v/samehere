import Link from "next/link";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  OpportunitiesStub,
  PitchStub,
} from "../modules/stubs";

export default function OpsDeskHome({ plan }: { plan: PathPlanUi }) {
  return (
    <div className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <PathHero plan={plan}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[var(--border)] pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Next listing
            </p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
              Software Engineering Intern
            </p>
            <p className="text-sm text-[var(--ink-muted)]">Target company · Strong fit</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/jobs"
              className="inline-flex h-10 items-center rounded-full bg-[var(--blue)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Open listing
            </Link>
            <Link
              href="/applications"
              className="inline-flex h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
            >
              View pipeline
            </Link>
          </div>
        </div>
      </PathHero>

      <div className="mt-10 space-y-10">
        <ApplicationsStub />
        <OpportunitiesStub />
        <PitchStub />
        <HelpersStub />
      </div>
    </div>
  );
}
