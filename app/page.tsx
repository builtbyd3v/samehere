import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import LandingAnalytics from "@/components/landing/LandingAnalytics";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "samehere: your path from zero to internship",
  description:
    "An adaptive internship coach for building experience, applying with intent, and preparing for interviews.",
  openGraph: {
    title: "samehere: your path from zero to internship",
    description:
      "A focused path for building experience, applying with intent, and preparing for interviews.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: your path from zero to internship",
    description:
      "A focused path for building experience, applying with intent, and preparing for interviews.",
  },
};

export default function Home() {
  return (
    <>
      <LandingAnalytics />
      <LandingPage />
    </>
  );
}
