import Link from "next/link";
import NavMenu from "./NavMenu";
import SearchBar from "@/components/search/SearchBar";
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
        {username && <SearchBar variant="nav" />}
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
