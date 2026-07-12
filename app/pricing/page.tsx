import type { Metadata } from "next";
import Link from "next/link";
import Pricing from "@/components/landing/Pricing";
import LandingFooter from "@/components/landing/LandingFooter";
import { signupCtaSm } from "@/components/landing/cta";

export const dynamic = "force-static";

export const metadata: Metadata = {
  // Root layout appends " · samehere" via the title template. Saying it here too
  // rendered "Pricing — samehere · samehere".
  title: "Pricing",
  description:
    "Free for every student. Pro adds a stronger AI model, who viewed you, a profile banner, and an animated avatar. $4.99/mo or $12.99/semester.",
};

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-6">
        <Link href="/" className="text-lg font-semibold tracking-[-0.02em] transition hover:opacity-80">
          samehere
        </Link>
        <Link href="/signup" className={signupCtaSm}>
          Join free
        </Link>
      </header>
      <Pricing />
      <LandingFooter />
    </main>
  );
}
