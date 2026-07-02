import "./globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";

// humanist warmth as a stand-in for Camera Plain Variable (see DESIGN.md)
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "samehere — the network for verified students",
  description: "A network for verified college students. Coming soon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.className} min-h-full bg-[var(--canvas)] text-[var(--ink)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
