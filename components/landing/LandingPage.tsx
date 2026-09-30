import PublicHeader from "@/components/brand/PublicHeader";
import { LightPool } from "@/components/ui/Backdrop";
import { loadLandingExamples } from "@/lib/landing/examples";
import { createAnonPortfolioClient } from "@/lib/portfolio/client";
import Features from "./Features";
import FinaleCta from "./FinaleCta";
import Hero from "./Hero";
import { MoreExamples } from "./HeroPreview";
import LandingFooter from "./LandingFooter";
import StageMarquee from "./StageMarquee";

// Static with ISR (app/page.tsx revalidate 300): the cookie-free anon client keeps the page cacheable.
export default async function LandingPage() {
  const examples = await loadLandingExamples(createAnonPortfolioClient());
  const featured = examples[0] ?? null;
  return (
    <main id="top" className="dark relative min-h-dvh overflow-x-clip bg-[var(--bg)] text-[var(--ink)]">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      {/* The one light pool on the site, behind the hero. */}
      <LightPool className="left-1/2 top-[-260px] h-[600px] w-[700px] -translate-x-1/2 md:top-[-420px] md:h-[900px] md:w-[1400px]" />
      <div aria-hidden className="grain pointer-events-none absolute inset-0 select-none opacity-[0.08] mix-blend-overlay" />
      <PublicHeader showExamples={featured !== null} />
      <Hero example={featured} />
      <MoreExamples examples={examples.slice(1)} />
      <StageMarquee />
      <Features example={featured} />
      <FinaleCta />
      <LandingFooter />
    </main>
  );
}
