import type { Metadata } from "next";
import Link from "next/link";
import Pricing from "@/components/landing/Pricing";
import LandingFooter from "@/components/landing/LandingFooter";
import AppBrandLink from "@/components/brand/AppBrandLink";
import BrandChrome from "@/components/brand/BrandChrome";
import { signupCtaSm } from "@/components/landing/cta";

export const dynamic = "force-static";

export const metadata: Metadata = {
  // Root layout appends " · samehere" via the title template. Saying it here too
  // rendered "Pricing — samehere · samehere".
  title: "Pricing",
  description:
    "Free mission path for every student. Pro $12/mo or $99/year for velocity. Ultra $29/mo or $249/year for interview season.",
};

export default function PricingPage() {
  return (
    <main className="landing-xai min-h-[100dvh] bg-[var(--canvas)] text-[var(--ink)]">
      <header className="landing-nav fixed inset-x-0 top-0 z-50">
        <BrandChrome
          right={
            <Link href="/signup" className={signupCtaSm}>
              Join free
            </Link>
          }
        >
          <AppBrandLink href="/" />
        </BrandChrome>
      </header>
      <div className="pt-[4.5rem]">
        <Pricing />
        <LandingFooter />
      </div>
    </main>
  );
}
