import LandingNav from "./LandingNav";
import Hero from "./Hero";
import PathSystem from "./PathSystem";
import MetricsStrip from "./MetricsStrip";
import Pricing from "./Pricing";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <main id="top" className="landing-xai">
      <LandingNav />
      <Hero />
      <PathSystem />
      <MetricsStrip />
      <Pricing />
      <LandingFooter />
    </main>
  );
}
