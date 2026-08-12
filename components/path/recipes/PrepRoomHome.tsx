import Link from "next/link";
import { ghostCta, signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
import PathHero from "../PathHero";
import {
  ApplicationsStub,
  HelpersStub,
  InterviewPrepStub,
} from "../modules/stubs";

export default function PrepRoomHome({
  plan,
  applicationStages,
  context,
  nextTask,
  taskHref,
}: PathHomeData) {
  const interview = context.interview;
  const prepHref = interview?.bankSlug
    ? `/prep/${encodeURIComponent(interview.bankSlug)}`
    : "/prep";

  return (
    <div className="mx-auto w-full max-w-3xl py-5 md:py-6">
      <PathHero plan={plan} nextTask={nextTask} taskHref={taskHref}>
        <div className="path-hero-listing">
          <p className="landing-demo-meta">
            {interview?.status === "oa" ? "Online assessment" : "Next interview"}
          </p>
          <p className="landing-opportunity-role mt-1">
            {interview ? `${interview.role} at ${interview.org}` : "Pick your target company"}
          </p>
          <p className="landing-opportunity-org">
            {interview?.bankSlug ? "Company practice is ready" : "Add an interview to your tracker"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={prepHref} className={signupCta}>
              Start practice
            </Link>
            <Link href="/messages" className={ghostCta}>
              Ask a helper
            </Link>
          </div>
        </div>
      </PathHero>

      <div id="practice" className="mt-6 space-y-4">
        <InterviewPrepStub
          company={interview?.org}
          prompt={interview?.question}
          href={prepHref}
        />
        <HelpersStub helpers={[]} />
        <div className="opacity-70">
          <ApplicationsStub stages={applicationStages} />
        </div>
      </div>
    </div>
  );
}
