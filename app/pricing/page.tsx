import type { Metadata } from "next";
import Pricing from "@/components/landing/Pricing";
import LandingFooter from "@/components/landing/LandingFooter";
import PublicHeader from "@/components/brand/PublicHeader";

export const dynamic = "force-static";

export const metadata: Metadata = {
  // Root layout appends " · samehere" via the title template. Saying it here too
  // rendered "Pricing — samehere · samehere".
  title: "Pricing",
  description:
    "Free for every student. Pro adds portfolio customization, 30-day views and link clicks, and a higher analysis allowance when analysis is available. $4.99/mo or $12.99/semester.",
};

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <PublicHeader action />
      <Pricing />
      <LandingFooter />
    </main>
  );
}
