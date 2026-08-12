import type { Metadata } from "next";
import Link from "next/link";
import Pricing from "@/components/landing/Pricing";
import LandingFooter from "@/components/landing/LandingFooter";
import AppBrandLink from "@/components/brand/AppBrandLink";
import { signupCtaSm } from "@/components/landing/cta";

export const dynamic = "force-static";

export const metadata: Metadata = {
  // Root layout appends " · samehere" via the title template. Saying it here too
  // rendered "Pricing — samehere · samehere".
  title: "Pricing",
  description:
    "Free mission path for every student. Pro $12/mo or $29/semester for velocity. Ultra $29/mo or $79/semester for interview season.",
};

export default function PricingPage() {
  return (
    <main className="landing-xai min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-6">
        <AppBrandLink href="/" />
        <Link href="/signup" className={signupCtaSm}>
          Join free
        </Link>
      </header>
      <Pricing />
      <LandingFooter />
    </main>
  );
}
