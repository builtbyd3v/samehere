import Link from "next/link";
import NavMenu from "./NavMenu";
import { IconBolt } from "@/components/icons";
import { signupCtaSm, ghostCtaSm } from "@/components/landing/cta";

export default function Navbar({
  username,
  avatarUrl,
  isPro,
  isAdmin,
}: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  isAdmin: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur">
      <nav className="app-nav mx-auto flex h-14 max-w-[1320px] items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Link href={username ? "/feed" : "/"} aria-label="samehere home" className="font-semibold tracking-[-0.03em] transition hover:opacity-80">
            <span className="text-[var(--ink)]">same</span><span className="text-[var(--blue)]">here</span>
          </Link>
          {isPro && (
            <Link
              href="/pro"
              title="Pro"
              className="grid h-7 w-7 place-items-center rounded-full text-[var(--blue)] transition hover:bg-[var(--featured-surface)]"
            >
              <IconBolt className="h-4 w-4" />
            </Link>
          )}
        </div>
        {username && (
          <form action="/search" className="nav-search hidden min-w-0 flex-1 justify-center px-4 md:flex">
            <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition focus-within:border-[var(--border-strong)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[var(--ink-muted)]" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input name="q" type="search" placeholder="Search students…" aria-label="Search students" className="w-full bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none" />
            </div>
          </form>
        )}
        {username ? (
          <div className="flex items-center gap-1 text-sm sm:gap-1.5">
            {!isPro && (
              <Link
                href="/pro"
                className="rounded-full px-2.5 py-1 font-medium text-[var(--blue)] transition hover:bg-[var(--featured-surface)]"
              >
                Join Pro
              </Link>
            )}
            <NavMenu username={username} avatarUrl={avatarUrl} isAdmin={isAdmin} isPro={isPro} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Link href="/login" className={ghostCtaSm}>
              Sign in
            </Link>
            <Link href="/signup" className={signupCtaSm}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
