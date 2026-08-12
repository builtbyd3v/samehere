import Link from "next/link";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  OpportunitiesStub,
} from "../modules/stubs";

export default function NetworkGapHome({ plan }: { plan: PathPlanUi }) {
  return (
    <div className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <PathHero plan={plan}>
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
          <Link
            href="/messages"
            className="inline-flex h-10 items-center rounded-full bg-[var(--blue)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Draft warm intros
          </Link>
          <Link
            href="/jobs"
            className="inline-flex h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
          >
            See target companies
          </Link>
        </div>
      </PathHero>

      <div className="mt-10 space-y-10">
        <HelpersStub />
        <OpportunitiesStub
          listings={[
            { org: "Stripe", title: "Software Engineering Intern", fit: "Helper available" },
            { org: "Notion", title: "Product Engineering Intern", fit: "Helper available" },
          ]}
        />
        <div className="opacity-70">
          <ApplicationsStub />
        </div>
      </div>
    </div>
  );
}
