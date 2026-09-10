import LandingNav from "./LandingNav";
import Hero from "./Hero";
import SocialPreview from "./SocialPreview";
import ProjectStory from "./ProjectStory";
import Pricing from "./Pricing";
import CommunityInvite from "./CommunityInvite";
import FinaleCta from "./FinaleCta";
import LandingFooter from "./LandingFooter";

export default function LandingPage({ founderSpotsLeft }: { founderSpotsLeft?: number }) {
  return (
    <main id="top" className="landing-xai">
      <LandingNav />
      <Hero />
      <SocialPreview />
      <ProjectStory />
      <Pricing />
      <CommunityInvite spotsLeft={founderSpotsLeft} />
      <FinaleCta />
      <LandingFooter />
    </main>
  );
}
