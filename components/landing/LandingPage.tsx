import type { ReactElement } from "react";
import { DotGrid, GrainOverlay, LightPool } from "@/components/ui/Backdrop";
import Features from "./Features";
import FinaleCta from "./FinaleCta";
import Hero from "./Hero";
import LandingFooter from "./LandingFooter";
import LandingNav from "./LandingNav";
import StageMarquee from "./StageMarquee";

// ponytail: app/page.tsx (out of scope) still passes founderSpotsLeft; the hero pill now
// advertises export instead (plan 011 decision). Drop the prop and its fetch together.
const LandingPage: (props: { founderSpotsLeft?: number }) => ReactElement = () => (
  <main id="top" className="relative min-h-dvh overflow-x-clip bg-[var(--bg)] text-[var(--ink)]">
    <a href="#main-content" className="landing-skip-link">
      Skip to content
    </a>
    {/* Decorative, aria-hidden inside the primitives. Geometry from the artboards. */}
    <LightPool className="left-1/2 top-[-260px] h-[600px] w-[700px] -translate-x-1/2 md:top-[-420px] md:h-[900px] md:w-[1400px]" />
    <DotGrid className="max-md:bg-[size:22px_22px] max-md:[mask-image:linear-gradient(to_bottom,black,transparent_600px)]" />
    <GrainOverlay />
    <LandingNav />
    <Hero />
    <StageMarquee />
    <Features />
    <FinaleCta />
    <LandingFooter />
  </main>
);

export default LandingPage;
