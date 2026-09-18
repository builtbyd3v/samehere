import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import LandingAnalytics from "@/components/landing/LandingAnalytics";
import { getFounderSpotsLeft } from "@/lib/founder";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "samehere: Build something. Find people who get it.",
  description:
    "Share what you're learning, turn your projects into a portfolio, and meet students on a similar path.",
  openGraph: {
    title: "samehere: Build something. Find people who get it.",
    description:
      "Share what you're learning, turn your projects into a portfolio, and meet students on a similar path.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: Build something. Find people who get it.",
    description:
      "Share what you're learning, turn your projects into a portfolio, and meet students on a similar path.",
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
