import type { ReactNode } from "react";
import { Chip, StageChip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { STAGE_LABELS } from "@/lib/stage";

const THUMB = "rounded-lg border";

const FEATURES: { id?: string; n: string; title: string; body: string; visual: ReactNode }[] = [
  {
    n: "01",
    title: "Meet your stage",
    body: "Pick where you are and your focus. Suggestions and search start from there.",
    visual: (
      <div className="flex flex-wrap gap-1.5">
        {(["internship_search", "building", "interning"] as const).map((stage) => (
          <StageChip key={stage} stage={stage} label={STAGE_LABELS[stage]} size="md" />
        ))}
      </div>
    ),
  },
  {
    id: "portfolio",
    n: "02",
    title: "Your profile is your resume",
    body: "Projects, skills, experience. One link that works logged out, one tap to export as an image.",
    visual: (
      <div className="flex items-end gap-2.5">
        <div className={`${THUMB} h-[46px] w-[88px] border-[var(--border)] bg-[var(--surface-4)]`} />
        <div className={`${THUMB} size-[60px] border-[var(--border)] bg-[var(--surface-4)]`} />
        <div
          className={`${THUMB} h-[78px] w-11 border-[var(--hairline-strong)] bg-[linear-gradient(180deg,rgba(47,109,176,0.5),var(--surface-4))]`}
        />
        <SectionLabel className="ml-1.5">Link · Square · Story</SectionLabel>
      </div>
    ),
  },
  {
    id: "unstuck",
    n: "03",
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
            key={f.n}
            id={f.id}
            className="flex scroll-mt-6 flex-col gap-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface-3)] p-[22px] transition-[translate,border-color] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/15 motion-safe:hover:-translate-y-[3px] lg:h-[360px] lg:gap-3.5 lg:rounded-3xl lg:p-8"
          >
            <SectionLabel size="sm">{f.n}</SectionLabel>
            <h3 className="text-[21px] font-semibold tracking-[-0.02em] lg:text-[26px]">{f.title}</h3>
            <p className="text-[15px] leading-[1.55] text-[var(--muted)]">{f.body}</p>
            <div className="grow" />
            <div className="hidden md:flex">{f.visual}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
