import Link from "next/link";
import { signupCta } from "@/components/landing/cta";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";
import {
  DossierStub,
  OpportunitiesStub,
  ProjectPlanStub,
  SkillStagesStub,
} from "../modules/stubs";

export default function StudioHome({
  plan,
  listings,
}: {
  plan: PathPlanUi;
  listings?: OpportunityListing[];
  applicationStages?: ApplicationStageCount[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
      <PathHero plan={plan}>
        <Link href="/projects/url-shortener" className={signupCta}>
          Continue this week&apos;s project
        </Link>
      </PathHero>

      <div id="project-plan" className="mt-6 space-y-4">
        <ProjectPlanStub />
        <DossierStub />
        <SkillStagesStub />
        <div className="opacity-70">
          <OpportunitiesStub
            listings={
              listings?.length
                ? listings
                : [
                    {
                      org: "Later",
                      title: "Apply after you have one solid project",
                      fit: "Demoted",
                    },
                  ]
            }
          />
        </div>
      </div>
    </div>
  );
}
