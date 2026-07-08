import CanvasGradient from "./CanvasGradient";
import LandingNav from "./LandingNav";
import Hero from "./Hero";
import StatsBar from "./StatsBar";
import HowItWorks from "./HowItWorks";
import LandingProfileDemo from "./LandingProfileDemo";
import Pricing from "./Pricing";
import Founders from "./Founders";
import FAQ from "./FAQ";
import CtaBand from "./CtaBand";
import LandingFooter from "./LandingFooter";

export default function LandingPage({ founderSpotsLeft }: { founderSpotsLeft?: number }) {
  return (
    <main id="top" className="relative min-h-[100dvh] bg-[var(--canvas)] pt-3 text-[var(--ink)]">
      <CanvasGradient />
      <LandingNav />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <LandingProfileDemo />
      <Pricing />
      <Founders spotsLeft={founderSpotsLeft} />
      <FAQ />
      <CtaBand />
      <LandingFooter />
    </main>
  );
}
