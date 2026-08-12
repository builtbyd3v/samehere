import Link from "next/link";
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
    <div className="mx-auto w-full max-w-xl py-6 md:py-10">
      <PathHero plan={plan}>
        <div
          id="focus-action"
          className="border-t border-[var(--border)] pt-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Only next action
          </p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]">
            {plan.module_order[0] === "applications"
              ? "Submit one application with a tailored pitch"
              : plan.module_order[0] === "interview_prep"
                ? "Write one practice answer out loud"
                : "Finish the next project checklist item"}
          </p>
          <Link
            href={nextHref}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-[var(--blue)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Do this now
          </Link>
        </div>
      </PathHero>
    </div>
  );
}
