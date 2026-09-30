import Link from "next/link";
import SameHereBrand from "@/components/brand/SameHereBrand";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/pricing", label: "Pricing" },
] as const;

const link = "inline-flex min-h-11 items-center hover:text-[var(--ink)]";

export default function LandingFooter() {
  return (
    <footer className="relative mt-14 border-t border-[var(--hairline)] lg:mt-[120px]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-7 text-[13px] text-[var(--faint)] md:px-8 md:py-10 xl:px-16">
        <Link href="/" aria-label="samehere home" className="landing-brand-link w-fit">
          <SameHereBrand mode="settled" title="samehere" />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-end gap-x-[18px] md:gap-x-6">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={link}>
              {l.label}
            </Link>
          ))}
          <a href="mailto:support@samehere.dev" className={link}>
            Feedback
          </a>
        </nav>
      </div>
    </footer>
  );
}
