import Link from "next/link";
import { signupCta } from "@/components/landing/cta";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
import type { PathPlanUi } from "@/lib/path/types";
import PathHero from "../PathHero";

export default function FocusTrackHome({
  plan,
}: {
  plan: PathPlanUi;
  listings?: OpportunityListing[];
  applicationStages?: ApplicationStageCount[];
}) {
  const nextHref =
    plan.module_order[0] === "applications"
      ? "/applications"
      : plan.module_order[0] === "interview_prep"
        ? "#focus-action"
        : "#focus-action";

  return (
    <div className="mx-auto w-full max-w-xl py-5 md:py-6">
      <PathHero plan={plan}>
        <div id="focus-action" className="path-hero-listing">
          <p className="landing-demo-meta">Only next action</p>
          <p className="landing-opportunity-role mt-2 text-lg">
            {plan.module_order[0] === "applications"
              ? "Submit one application with a tailored pitch"
              : plan.module_order[0] === "interview_prep"
                ? "Write one practice answer out loud"
                : "Finish the next project checklist item"}
          </p>
          <Link href={nextHref} className={`mt-5 inline-flex ${signupCta}`}>
            Do this now
          </Link>
        </div>
      </PathHero>
    </div>
  );
}
