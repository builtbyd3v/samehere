import LandingNav from "./LandingNav";
import Hero from "./Hero";
import LandingProfileDemo from "./LandingProfileDemo";
import AISection from "./AISection";
import Pricing from "./Pricing";
import FAQ from "./FAQ";
import CtaBand from "./CtaBand";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <LandingNav />
      <Hero />
      <LandingProfileDemo />
      <AISection />
      <Pricing />
      <FAQ />
      <CtaBand />
      <LandingFooter />
    </main>
  );
}
