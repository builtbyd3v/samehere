import Link from "next/link";
import { ghostCta, signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
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
  context,
  nextTask,
  taskHref,
}: PathHomeData) {
  const helpers = context.helpers;
  const introHref = helpers[0]?.href ?? "/messages";
  return (
    <div className="path-recipe path-recipe-network mx-auto w-full max-w-6xl py-5 md:py-7">
      <PathHero plan={plan} nextTask={nextTask} taskHref={taskHref}>
        <div className="flex flex-wrap gap-2">
          <Link href={introHref} className={signupCta}>
            Draft warm intros
          </Link>
          <Link href="/jobs" className={ghostCta}>
            See target companies
          </Link>
        </div>
      </PathHero>

      <div className="path-workspace-grid path-workspace-network">
        <HelpersStub helpers={helpers} />
        <OpportunitiesStub listings={listings} />
        <ApplicationsStub stages={applicationStages} />
      </div>
    </div>
  );
}
