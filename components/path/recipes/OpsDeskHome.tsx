import Link from "next/link";
import { ghostCta, signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  OpportunitiesStub,
  PitchStub,
} from "../modules/stubs";

export default function OpsDeskHome({
  plan,
  listings,
  applicationStages,
  context,
  nextTask,
  taskHref,
}: PathHomeData) {
  const top = listings?.[0];
  const listingHref = top ? `/jobs/${top.id}` : "/jobs";

  return (
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
      <PathHero plan={plan} nextTask={nextTask} taskHref={taskHref}>
        <div className="landing-opportunity path-hero-listing">
          <div>
            <p className="landing-demo-meta">Next listing</p>
            <p className="landing-opportunity-role mt-1">
              {top?.title ?? "Software Engineering Intern"}
            </p>
            <p className="landing-opportunity-org">
              {top
                ? `${top.org}${top.fit ? ` · ${top.fit}` : ""}`
                : "Target company · Strong fit"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={listingHref} className={signupCta}>
              Open listing
            </Link>
            <Link href="/applications" className={ghostCta}>
              View pipeline
            </Link>
          </div>
        </div>
      </PathHero>

      <div className="mt-6 space-y-4">
        <ApplicationsStub stages={applicationStages} />
        <OpportunitiesStub listings={listings} />
        <PitchStub listingId={top?.id} />
        <HelpersStub helpers={context.helpers} />
      </div>
    </div>
  );
}
