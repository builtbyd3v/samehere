import "./globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";

// humanist warmth as a stand-in for Camera Plain Variable (see DESIGN.md)
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://samehere.app"),
  title: {
    default: "samehere — the network for verified students",
    template: "%s · samehere",
  },
  description: "A network for verified college students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.className} min-h-full bg-[var(--canvas)] text-[var(--ink)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
