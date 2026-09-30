import type { Metadata } from "next";
import "./landing-xai.css";
import LandingPage from "@/components/landing/LandingPage";
import LandingAnalytics from "@/components/landing/LandingAnalytics";
import { SITE_OG_DESCRIPTION, SITE_OG_TITLE } from "@/lib/og/copy";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  title: SITE_OG_TITLE,
  description: SITE_OG_DESCRIPTION,
  openGraph: {
    title: SITE_OG_TITLE,
    description: SITE_OG_DESCRIPTION,
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_OG_TITLE,
    description: SITE_OG_DESCRIPTION,
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
