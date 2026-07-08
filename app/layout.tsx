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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.samehere.dev"),
  title: {
    default: "samehere: the network for verified students",
    template: "%s · samehere",
  },
  description: "Verified students only, .edu required. The social network for college.",
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
