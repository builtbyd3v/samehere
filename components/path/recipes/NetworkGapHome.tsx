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
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
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

      <div className="mt-6 space-y-4">
        <HelpersStub helpers={helpers} />
        <OpportunitiesStub listings={listings} />
        <div className="opacity-70">
          <ApplicationsStub stages={applicationStages} />
        </div>
      </div>
    </div>
  );
}
