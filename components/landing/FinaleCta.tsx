import { Button } from "@/components/ui/Button";
import { LightPool } from "@/components/ui/Backdrop";
import { HairlineCard } from "@/components/ui/HairlineCard";

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
        {/* Centered on the panel's top edge, like the artboard's top-center glow. */}
        <LightPool className="left-1/2 top-0 h-[160%] w-full -translate-x-1/2 -translate-y-1/2" />
        <h2
          id="finale-title"
          className="relative text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl lg:max-w-[820px] lg:text-[64px] lg:leading-none lg:tracking-[-0.045em]"
        >
          You&apos;re not the only one.
        </h2>
        <p className="relative hidden text-lg text-[var(--muted)] md:block">Free. Pick your stage when you join.</p>
        <Button href="/signup" variant="primary" size="lg" className="w-full md:w-auto">
          Join samehere
        </Button>
      </HairlineCard>
    </section>
  );
}
