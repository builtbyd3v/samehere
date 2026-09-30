import { Button } from "@/components/ui/Button";
import { LightPool } from "@/components/ui/Backdrop";
import { HairlineCard } from "@/components/ui/HairlineCard";
import { serifAccent } from "./cta";

export default function FinaleCta() {
  return (
    <section
      aria-labelledby="finale-title"
      className="relative mx-auto mt-[72px] max-w-[1440px] px-4 md:px-8 lg:mt-[200px] xl:px-16"
    >
      <HairlineCard
        radius={32}
        innerClassName="relative flex flex-col items-center gap-[18px] px-[22px] py-12 text-center md:gap-6 md:px-16 md:py-24"
      >
        {/* The deep pool is centered at 22% of its box; this box puts that point at the panel's top center. */}
        <LightPool tone="deep" className="left-[21%] top-0 h-full w-[133%]" />
        <h2
          id="finale-title"
          className="relative text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl lg:max-w-[820px] lg:text-[64px] lg:leading-none lg:tracking-[-0.045em]"
        >
          Someone is exactly <span className={serifAccent}>where you are.</span>
        </h2>
        <p className="relative hidden text-lg text-[var(--muted)] md:block">Free. Pick your stage when you join.</p>
        <Button href="/signup" variant="primary" size="lg" className="w-full md:w-auto">
          Join samehere
        </Button>
      </HairlineCard>
    </section>
  );
}
