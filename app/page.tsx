import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import LandingAnalytics from "@/components/landing/LandingAnalytics";
import { getFounderSpotsLeft } from "@/lib/founder";

export const metadata: Metadata = {
  title: "samehere: the social network built for students",
  description:
    "Built for students. Join free, post what's real, react with SameHere, and find people who get it.",
  openGraph: {
    title: "samehere: you're not the only one",
    description:
      "Built for students. Post what's real and find people who say same here.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: you're not the only one",
    description:
      "Built for students. Post what's real and find people who say same here.",
  },
};

export default async function Home() {
  const founderSpotsLeft = await getFounderSpotsLeft();
  return (
    <>
      <LandingAnalytics />
      <LandingPage founderSpotsLeft={founderSpotsLeft} />
    </>
  );
}
