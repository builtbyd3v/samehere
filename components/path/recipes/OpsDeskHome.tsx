import Link from "next/link";
import { ghostCta, signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
import PathHero from "../PathHero";
import { HelpersStub, PitchStub } from "../modules/stubs";
import OpsDeskSwitchboard from "./OpsDeskSwitchboard";

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
    <div className="path-recipe path-recipe-ops mx-auto w-full max-w-6xl py-5 md:py-7">
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

      <div className="path-workspace-grid path-workspace-ops">
        <OpsDeskSwitchboard applicationStages={applicationStages} listings={listings} />
        <PitchStub listingId={top?.id} />
        <HelpersStub helpers={context.helpers} />
      </div>
    </div>
  );
}
