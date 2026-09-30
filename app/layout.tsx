import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SITE_OG_DESCRIPTION, SITE_OG_TITLE } from "@/lib/og/copy";

// Geist for text, Geist Mono for small uppercase labels. display:swap plus next/font's default adjustFontFallback keep text visible while they load. OG images load their own TTFs (lib/og/fonts.ts).
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const TITLE = SITE_OG_TITLE;
const DESCRIPTION = SITE_OG_DESCRIPTION;

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
      <body className={`${geist.variable} ${geistMono.variable} min-h-full bg-[var(--bg)] font-sans text-[var(--ink)] antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
