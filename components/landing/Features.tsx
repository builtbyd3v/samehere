import type { ReactNode } from "react";
import { Chip, StageChip } from "@/components/ui/Chip";
import { STAGE_LABELS, STAGES } from "@/lib/stage";

const FEATURES: { id: string; title: string; body: string; visual: ReactNode }[] = [
  {
    id: "stages",
    title: "Meet your stage",
    body: "Pick where you are and your focus. Suggestions and search start from there.",
    visual: (
      <div className="flex flex-wrap gap-1.5">
        {STAGES.map((stage) => (
          <StageChip key={stage} stage={stage} label={STAGE_LABELS[stage]} size="md" />
        ))}
      </div>
    ),
  },
  {
    id: "portfolio",
    title: "Your profile is your resume",
    body: "Projects, skills, experience. One link that works logged out, one tap to export as an image.",
    visual: null,
  },
  {
    id: "unstuck",
    title: "Stuck? Ask one step up",
    body: "Post what is blocking you with the Stuck label. Students at your stage, and one step ahead, can answer.",
    visual: (
      <Chip tone="amber" size="md">
        Stuck
      </Chip>
    ),
  },
];

export default function Features() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="relative mx-auto max-w-[1440px] px-4 pt-20 md:px-8 lg:pt-40 xl:px-16"
    >
      <div className="mb-6 md:mb-10 lg:flex lg:items-end lg:justify-between">
        <h2
          id="how-title"
          className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px] lg:max-w-[720px] lg:text-[56px] lg:leading-none lg:tracking-[-0.04em]"
        >
          Built for the part you are in.
        </h2>
        <p className="hidden text-pretty text-base leading-[1.55] text-[var(--muted)] md:mt-4 md:block lg:mt-0 lg:max-w-[340px]">
          Not a popularity contest. Just students one step behind, beside, and ahead of you.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {FEATURES.map((f) => (
          <article
            key={f.id}
            id={f.id}
            className="flex scroll-mt-6 flex-col gap-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface-3)] p-[22px] lg:gap-3.5 lg:rounded-3xl lg:p-8"
          >
            <h3 className="text-balance text-[21px] font-semibold tracking-[-0.02em] lg:text-[26px]">{f.title}</h3>
            <p className="text-pretty text-[15px] leading-[1.55] text-[var(--muted)]">{f.body}</p>
            {f.visual ? <div className="mt-auto hidden pt-3 md:flex">{f.visual}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
