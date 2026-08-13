import Link from "next/link";
import { signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
import PathHero from "../PathHero";

export default function FocusTrackHome({
  plan,
  nextTask,
  taskHref,
}: PathHomeData) {
  const nextHref =
    plan.module_order[0] === "applications"
      ? "/applications"
      : plan.module_order[0] === "interview_prep"
        ? "#focus-action"
        : "#focus-action";

  return (
    <div className="path-recipe path-recipe-focus">
      <PathHero plan={plan} nextTask={nextTask} taskHref={taskHref}>
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
