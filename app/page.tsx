import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { getFounderSpotsLeft } from "@/lib/founder";

export const metadata: Metadata = {
  title: "samehere: the network for verified students",
  description:
    "Verified students only, .edu required. Post what's real, react with SameHere, and find people who get it.",
  openGraph: {
    title: "samehere: you're not the only one",
    description:
      "Verified students only. Post what's real and find people who say same here.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: you're not the only one",
    description:
      "Verified students only. Post what's real and find people who say same here.",
  },
};

export default async function Home() {
  const founderSpotsLeft = await getFounderSpotsLeft();
  return <LandingPage founderSpotsLeft={founderSpotsLeft} />;
}
