import Link from "next/link";
import { signupCtaSm } from "./cta";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--canvas)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5">
        <Link href="/" className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
          samehere
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--ink)] md:flex">
          <a href="#features" className="transition hover:opacity-70">
            Profile
          </a>
          <a href="#ai" className="transition hover:opacity-70">
            AI
          </a>
          <a href="#pricing" className="transition hover:opacity-70">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className={`hidden text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)] sm:inline-flex`}>
            Log in
          </Link>
          <Link href="/signup" className={signupCtaSm}>
            Join with your .edu
          </Link>
        </div>
      </div>
    </header>
  );
}
