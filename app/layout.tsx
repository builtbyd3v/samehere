import "./globals.css";
import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

// humanist warmth as a stand-in for Camera Plain Variable (see DESIGN.md)
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"] });
// Editorial display face — the warm, characterful headline voice (see DESIGN.md
// overhaul). Exposed as --font-display; use via the .font-display utility.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const TITLE = "samehere: the network for verified students";
const DESCRIPTION = "Verified students only, .edu required. The social network for college.";

// No `images` in either block on purpose. Next merges the file-based
// opengraph-image / twitter-image routes in automatically, and an explicit
// `images` entry here would override them — including the per-profile heatmap
// card, which is the whole point of the share image. Child routes inherit
// everything below and override only title/description.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.samehere.dev"),
  title: {
    default: TITLE,
    template: "%s · samehere",
  },
  description: DESCRIPTION,
  applicationName: "samehere",
  openGraph: {
    type: "website",
    siteName: "samehere",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  // Without an explicit card, Twitter and several other unfurlers fall back to
  // the small square `summary` layout and crop the 1200x630 card to an avatar.
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.className} ${fraunces.variable} min-h-full bg-[var(--canvas)] text-[var(--ink)] antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
