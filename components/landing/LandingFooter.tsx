import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[1200px] px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em]">samehere</p>
            <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-[var(--ink-muted)]">
              The network for verified students. Built for the people figuring it out.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--ink-muted)]">
            <a href="mailto:support@samehere.dev" className="underline-offset-4 hover:underline">
              Feedback
            </a>
            <Link href="/terms" className="underline-offset-4 hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              Privacy
            </Link>
            <Link href="/signup" className="underline-offset-4 hover:underline">
              Sign up
            </Link>
          </nav>
        </div>
        <p className="mt-10 text-sm text-[var(--ink-faint)]">© 2026 samehere</p>
      </div>
    </footer>
  );
}
