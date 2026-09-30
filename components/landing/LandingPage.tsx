import type { ReactElement } from "react";
import { LightPool } from "@/components/ui/Backdrop";
import Features from "./Features";
import FinaleCta from "./FinaleCta";
import Hero from "./Hero";
import LandingFooter from "./LandingFooter";
import LandingNav from "./LandingNav";

const LandingPage: () => ReactElement = () => (
  <main id="top" className="dark relative min-h-dvh overflow-x-clip bg-[var(--bg)] text-[var(--ink)]">
    <a href="#main-content" className="landing-skip-link">
      Skip to content
    </a>
    {/* Decorative, aria-hidden inside the primitives. Geometry from the artboards. */}
    <LightPool className="left-1/2 top-[-260px] h-[600px] w-[700px] -translate-x-1/2 md:top-[-420px] md:h-[900px] md:w-[1400px]" />
    <LandingNav />
    <Hero />
    <Features />
    <FinaleCta />
    <LandingFooter />
  </main>
);

export default LandingPage;
