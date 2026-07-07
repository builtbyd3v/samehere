import type { Metadata } from "next";
import Link from "next/link";
import Pricing from "@/components/landing/Pricing";
import LandingFooter from "@/components/landing/LandingFooter";
import { signupCtaSm } from "@/components/landing/cta";

export const metadata: Metadata = {
  title: "Pricing — samehere",
  description:
    "Free for every verified student. Pro adds unlimited AI, who-viewed-you, and more for $4.99/mo or $12.99/semester.",
};

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-6">
        <Link href="/" className="text-lg font-semibold tracking-[-0.02em] transition hover:opacity-80">
          samehere
        </Link>
        <Link href="/signup" className={signupCtaSm}>
          Join with .edu
        </Link>
      </header>
      <Pricing />
      <LandingFooter />
    </main>
  );
}
