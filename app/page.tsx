import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "samehere: the network for verified students",
  description:
    "The social network for verified students. Post the real stuff, react with SameHere, and find people who get it.",
  openGraph: {
    title: "samehere: you're not the only one",
    description:
      "Verified students only. Post the real stuff and find people who say same here.",
    type: "website",
    siteName: "samehere",
  },
  twitter: {
    card: "summary_large_image",
    title: "samehere: you're not the only one",
    description:
      "Verified students only. Post the real stuff and find people who say same here.",
  },
};

export default function Home() {
  return <LandingPage />;
}
