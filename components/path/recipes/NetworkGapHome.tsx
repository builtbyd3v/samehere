import Link from "next/link";
import { ghostCta, signupCta } from "@/components/landing/cta";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  OpportunitiesStub,
} from "../modules/stubs";

export default function NetworkGapHome({
  plan,
  listings,
  applicationStages,
}: {
  plan: PathPlanUi;
  listings?: OpportunityListing[];
  applicationStages?: ApplicationStageCount[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
      <PathHero plan={plan}>
        <div className="flex flex-wrap gap-2">
          <Link href="/messages" className={signupCta}>
            Draft warm intros
          </Link>
          <Link href="/jobs" className={ghostCta}>
            See target companies
          </Link>
        </div>
      </PathHero>

      <div className="mt-6 space-y-4">
        <HelpersStub />
        <OpportunitiesStub
          listings={
            listings?.length
              ? listings
              : [
                  {
                    org: "Stripe",
                    title: "Software Engineering Intern",
                    fit: "Helper available",
                  },
                  {
                    org: "Notion",
                    title: "Product Engineering Intern",
                    fit: "Helper available",
                  },
                ]
          }
        />
        <div className="opacity-70">
          <ApplicationsStub stages={applicationStages} />
        </div>
      </div>
    </div>
  );
}
