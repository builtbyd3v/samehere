import { buttonClass } from "@/components/ui/Button";
import { StageChip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { STAGE_LABELS, STAGES } from "@/lib/stage";

// The track slides left by half its width, so it holds four identical lists:
// two lists always cover a 1440px viewport. Copies 2-4 are hidden from screen readers.
const COPIES = [0, 1, 2, 3] as const;

const PAUSE_ID = "stage-marquee-pause";

export default function StageMarquee() {
  return (
    <section id="stages" className="group relative mt-11 overflow-hidden pb-5 md:mt-[60px]">
      <SectionLabel as="h2" size="sm" className="sr-only md:not-sr-only md:mb-5 md:text-center">
        Every stage of a CS journey
      </SectionLabel>
      <div className="flex w-max animate-[landing-marquee_30s_linear_infinite] hover:[animation-play-state:paused] group-has-[:checked]:[animation-play-state:paused] md:animate-[landing-marquee_40s_linear_infinite] motion-reduce:w-full motion-reduce:animate-none md:motion-reduce:animate-none">
        {COPIES.map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy > 0 ? true : undefined}
            className={
              copy > 0
                ? "flex shrink-0 gap-2 pr-2 md:gap-3 md:pr-3 motion-reduce:hidden"
                : "flex shrink-0 gap-2 pr-2 md:gap-3 md:pr-3 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4"
            }
          >
            {STAGES.map((stage) => (
              <li key={stage}>
                <StageChip stage={stage} label={STAGE_LABELS[stage]} size="md" />
              </li>
            ))}
          </ul>
        ))}
      </div>
      {/* WCAG 2.2.2: a visible, keyboard-reachable pause. CSS only: the checked box pauses the track above. */}
      <div className="mt-3 flex justify-center motion-reduce:hidden">
        <input id={PAUSE_ID} type="checkbox" className="peer sr-only" />
        <label
          htmlFor={PAUSE_ID}
          className={`${buttonClass("ghost", "sm")} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]`}
        >
          <span className="sr-only">Pause the stage animation</span>
          <span aria-hidden className="group-has-[:checked]:hidden">
            Pause
          </span>
          <span aria-hidden className="hidden group-has-[:checked]:inline">
            Play
          </span>
        </label>
      </div>
    </section>
  );
}
