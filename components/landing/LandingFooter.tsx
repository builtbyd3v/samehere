import Link from "next/link";
import SameHereMark from "@/components/SameHereMark";

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          href="/"
          aria-label="SameHere home"
          className="landing-brand-link w-fit"
        >
          <SameHereMark className="size-8" title="SameHere" />
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
