import Link from "next/link";
import AppBrand from "@/components/brand/AppBrand";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "#examples", label: "Examples", examplesOnly: true },
  { href: "#how", label: "How it works", examplesOnly: false },
  { href: "/pricing", label: "Pricing", examplesOnly: false },
] as const;

const quiet = "inline-flex min-h-11 items-center text-sm text-[var(--muted)] hover:text-[var(--ink)]";

export default function LandingNav({ showExamples }: { showExamples: boolean }) {
  return (
    <header className="relative z-10">
      <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto] items-center gap-4 px-4 md:h-[72px] md:px-8 lg:grid-cols-[1fr_auto_1fr] xl:px-16">
        <AppBrand href="/" className="landing-brand-link justify-self-start" />
        <nav aria-label="Page sections" className="hidden items-center gap-8 lg:flex">
          {LINKS.filter((l) => showExamples || !l.examplesOnly).map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className={quiet}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 justify-self-end md:gap-2.5">
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
