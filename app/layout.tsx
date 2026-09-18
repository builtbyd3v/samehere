import "./globals.css";
import "./landing-xai.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"] });

const TITLE = "samehere: Find your people. Show what you’re building.";
const DESCRIPTION =
  "A place for CS students to share the work, find a familiar struggle, and build a profile that feels like them.";

const THEME_INIT = `(function(){try{var k="samehere-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="system"){localStorage.setItem(k,"dark");t="dark";}var r=document.documentElement;r.classList.remove("light","dark");if(t==="light")r.classList.add("light");else if(t==="dark")r.classList.add("dark");}catch(e){document.documentElement.classList.add("dark");}})();`;

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
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "samehere",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${figtree.className} min-h-full bg-[var(--canvas)] text-[var(--ink)] antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
