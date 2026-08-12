import Link from "next/link";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  InterviewPrepStub,
} from "../modules/stubs";

export default function PrepRoomHome({ plan }: { plan: PathPlanUi }) {
  return (
    <div className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <PathHero plan={plan}>
        <div className="border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Next interview
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Behavioral loop · Target company
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Thursday · practice set ready</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/prep"
              className="inline-flex h-10 items-center rounded-full bg-[var(--blue)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Start practice
            </Link>
            <Link
              href="/messages"
              className="inline-flex h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
            >
              Ask a helper
            </Link>
          </div>
        </div>
      </PathHero>

      <div id="practice" className="mt-10 space-y-10">
        <InterviewPrepStub />
        <HelpersStub
          helpers={[{ name: "Alex M.", org: "Target company", note: "Open to help" }]}
        />
        <div className="opacity-70">
          <ApplicationsStub stages={[{ label: "Interview", count: 1 }, { label: "Applied", count: 3 }]} />
        </div>
      </div>
    </div>
  );
}
