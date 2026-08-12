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
  InterviewPrepStub,
} from "../modules/stubs";

export default function PrepRoomHome({
  plan,
  applicationStages,
}: {
  plan: PathPlanUi;
  listings?: OpportunityListing[];
  applicationStages?: ApplicationStageCount[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
      <PathHero plan={plan}>
        <div className="path-hero-listing">
          <p className="landing-demo-meta">Next interview</p>
          <p className="landing-opportunity-role mt-1">
            Behavioral loop · Target company
          </p>
          <p className="landing-opportunity-org">Thursday · practice set ready</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/prep" className={signupCta}>
              Start practice
            </Link>
            <Link href="/messages" className={ghostCta}>
              Ask a helper
            </Link>
          </div>
        </div>
      </PathHero>

      <div id="practice" className="mt-6 space-y-4">
        <InterviewPrepStub />
        <HelpersStub
          helpers={[{ name: "Alex M.", org: "Target company", note: "Open to help" }]}
        />
        <div className="opacity-70">
          <ApplicationsStub
            stages={
              applicationStages ?? [
                { label: "Interview", count: 1 },
                { label: "Applied", count: 3 },
              ]
            }
          />
        </div>
      </div>
    </div>
  );
}
