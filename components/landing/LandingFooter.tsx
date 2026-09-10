import Link from "next/link";
import SameHereBrand from "@/components/brand/SameHereBrand";

export default function LandingFooter() {
  return (
    <div className="landing-xai">
      <footer className="landing-footer">
        <div className="flex min-w-0 flex-col gap-2">
          <Link href="/" aria-label="samehere home" className="landing-brand-link w-fit">
            <SameHereBrand mode="settled" title="samehere" />
          </Link>
          <p className="max-w-[18rem] text-balance">
            Share the work. Find people who get it.
          </p>
        </div>
        <nav aria-label="Footer">
          <a href="mailto:support@samehere.dev">Feedback</a>
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/signup">Sign up</Link>
        </nav>
        <p>© 2026</p>
      </footer>
    </div>
  );
}
