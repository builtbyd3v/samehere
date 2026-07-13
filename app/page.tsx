import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import LandingAnalytics from "@/components/landing/LandingAnalytics";
import { getFounderSpotsLeft } from "@/lib/founder";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "samehere: find your people, find your path",
  description:
    "One AI-native network for students. Post what's real, find who gets it, and land the internship. Verified students, real activity, free to join.",
  openGraph: {
    title: "samehere: you're not the only one",
    description:
      "Describe who you're looking for and samehere's AI finds students like you. Verified students, real activity, free to join.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: you're not the only one",
    description:
      "Describe who you're looking for and samehere's AI finds students like you. Verified students, real activity, free to join.",
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
