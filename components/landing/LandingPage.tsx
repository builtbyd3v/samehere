import CanvasGradient from "./CanvasGradient";import LandingNav from "./LandingNav";
import Hero from "./Hero";
import LandingProfileDemo from "./LandingProfileDemo";
import AISection from "./AISection";
import Pricing from "./Pricing";
import FAQ from "./FAQ";
import CtaBand from "./CtaBand";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <main id="top" className="relative min-h-[100dvh] bg-[var(--canvas)] pt-3 text-[var(--ink)]">
      <CanvasGradient />
      <LandingNav />
      <Hero />
      <LandingProfileDemo />      <AISection />
      <Pricing />
      <FAQ />
      <CtaBand />
      <LandingFooter />
    </main>
  );
}
