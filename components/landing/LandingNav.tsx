import Link from "next/link";
import AppBrand from "@/components/brand/AppBrand";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "#stages", label: "Stages" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#unstuck", label: "Get unstuck" },
  { href: "/pricing", label: "Pricing" },
] as const;

const quiet = "inline-flex min-h-11 items-center text-sm text-[var(--muted)] hover:text-[var(--ink)]";

export default function LandingNav() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:h-[72px] md:px-8 xl:px-16">
        <AppBrand href="/" className="landing-brand-link" />
        <nav aria-label="Page sections" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className={quiet}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 md:gap-2.5">
          <Link href="/login" className={`${quiet} px-3`}>
            Log in
          </Link>
          <Button href="/signup" variant="primary" size="md" className="max-md:h-11">
            Join free
          </Button>
        </div>
      </div>
    </header>
  );
}
