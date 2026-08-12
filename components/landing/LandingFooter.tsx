"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import SameHereMark from "@/components/SameHereMark";

export default function LandingFooter() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const scrollBehavior = reduceMotion ? "auto" : "smooth";

  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: scrollBehavior });
    window.history.replaceState(null, "", "/");
  }

  return (
    <footer className="landing-footer">
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          href="/"
          aria-label="samehere home"
          className="landing-brand-link w-fit"
          onClick={goHome}
        >
          <SameHereMark className="size-8" title="samehere" />
        </Link>
        <p className="max-w-[18rem] text-balance">
          One next move toward your internship.
        </p>
      </div>
      <nav aria-label="Footer">
        <a href="mailto:support@samehere.dev">Feedback</a>
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <p>© 2026</p>
    </footer>
  );
}
