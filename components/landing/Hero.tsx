import { ArrowRight, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { LandingExample } from "@/lib/landing/examples";
import HeroPreview from "./HeroPreview";

export default function Hero({ example = null, postCreatedAt }: { example?: LandingExample | null; postCreatedAt: string }) {
  return (
    <section id="main-content" tabIndex={-1} className="relative outline-none">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pt-12 md:items-center md:gap-0 md:px-8 md:pt-20 md:text-center xl:px-16 xl:pt-28">
        <Reveal className="hidden md:block">
          <p className="flex h-[30px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--fill-1)] px-3 text-[13px] text-[var(--ink-3)]">
            <ImageDown size={14} strokeWidth={1.8} aria-hidden className="text-[var(--accent)]" />
            Export your profile as a story card
          </p>
        </Reveal>
        {/* LCP element: no reveal animation on purpose. */}
        <h1 className="text-balance text-[46px] font-semibold leading-none tracking-[-0.045em] md:mt-7 md:text-[72px] md:leading-[0.98] xl:max-w-[1040px] xl:text-[92px]">
          Find the people at your exact stage.
        </h1>
        <Reveal delay={160}>
          <p className="max-w-[46ch] text-pretty text-[17px] leading-normal text-[var(--muted)] md:mt-7 md:text-xl">
            samehere connects CS, SWE and engineering students by where they are right now. Your profile doubles as a resume you can share anywhere.
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
          <SectionLabel as="p" className="text-center md:mt-4">
            Free for students · No leaderboards
          </SectionLabel>
        </Reveal>
      </div>
      <HeroPreview example={example} postCreatedAt={postCreatedAt} />
    </section>
  );
}
