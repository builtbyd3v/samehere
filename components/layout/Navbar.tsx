import Link from "next/link";
import NavMenu from "./NavMenu";

// Server component — top-level stays plain links (no client JS); the avatar
// dropdown is the one client island (NavMenu).
export default function Navbar({
  username,
  avatarUrl,
}: {
  username: string | null;
  avatarUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        <Link href="/feed" className="font-semibold tracking-[-0.02em]">
          samehere
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/search" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
            Search
          </Link>
          <Link href="/saved" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
            Saved
          </Link>
          {/* notifications bell slots in here next (Phase 14) */}
          {username && <NavMenu username={username} avatarUrl={avatarUrl} />}
        </div>
      </nav>
    </header>
  );
}
