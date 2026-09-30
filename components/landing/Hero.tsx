import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Reveal } from "@/components/ui/Reveal";
import HeroPreview from "./HeroPreview";
import { serifAccent } from "./cta";

export default function Hero() {
  return (
    <section id="main-content" tabIndex={-1} className="relative outline-none">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pt-12 md:items-center md:gap-0 md:px-8 md:pt-20 md:text-center xl:px-16 xl:pt-28">
        <Reveal className="hidden md:block">
          <p className="flex h-[30px] items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.04] pl-1.5 pr-3 text-[13px] text-[var(--ink-3)]">
            <span className="rounded-full bg-[var(--accent-soft)] px-[7px] py-[3px] font-mono text-[11px] leading-none text-[var(--accent-2)]">
              NEW
            </span>
            Export your profile as a story card
          </p>
        </Reveal>
        {/* LCP element: no reveal animation on purpose. */}
        <h1 className="text-balance text-[46px] font-semibold leading-none tracking-[-0.045em] md:mt-7 md:text-[72px] md:leading-[0.98] xl:max-w-[1040px] xl:text-[92px]">
          Find the people at your <span className={serifAccent}>exact</span> stage.
        </h1>
        <Reveal delay={160}>
          <p className="text-pretty text-[17px] leading-normal text-[var(--muted)] md:mt-7 md:max-w-[640px] md:text-xl">
            <span className="md:hidden">
              For CS, SWE and engineering students. Meet people where you are right now, and turn your profile into a
              resume you can share anywhere.
            </span>
            <span className="hidden md:inline">
              samehere connects CS, SWE and engineering students by where they are right now: learning, building,
              hunting internships. Your profile doubles as a resume you can share anywhere.
            </span>
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="flex flex-col gap-3 md:mt-10 md:flex-row">
            <Button href="/signup" variant="primary" size="lg" className="w-full md:w-auto">
              Find your stage <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Button>
            <Button href="#how" variant="secondary" size="lg" className="w-full md:w-auto">
              See how it works
            </Button>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <MonoLabel as="p" className="text-center md:mt-4 md:text-xs">
            Free for students · No endorsements · No leaderboards
          </MonoLabel>
        </Reveal>
      </div>
      <HeroPreview />
    </section>
  );
}
