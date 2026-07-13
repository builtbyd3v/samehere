import CanvasGradient from "./CanvasGradient";
import LandingNav from "./LandingNav";
import Hero from "./Hero";
import ProofWall from "./ProofWall";
import HeatmapProof from "./HeatmapProof";
import JobsProof from "./JobsProof";
import Pricing from "./Pricing";
import Founders from "./Founders";
import FAQ from "./FAQ";
import FinaleCta from "./FinaleCta";
import LandingFooter from "./LandingFooter";

export default function LandingPage({ founderSpotsLeft }: { founderSpotsLeft?: number }) {
  return (
    <main id="top" className="relative min-h-[100dvh] bg-[var(--canvas)] pt-3 text-[var(--ink)]">
      <CanvasGradient />
      <LandingNav />
      <Hero />
      <ProofWall />
      <HeatmapProof />
      <JobsProof />
      <Pricing />
      <Founders spotsLeft={founderSpotsLeft} />
      <FAQ />
      <FinaleCta />
      <LandingFooter />
    </main>
  );
}
