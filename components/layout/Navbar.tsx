import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";

// Server component — logout is a form action, links are plain, so no client JS.
export default function Navbar({ username }: { username: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        <Link href="/feed" className="font-semibold tracking-[-0.02em]">
          samehere
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/feed" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
            Feed
          </Link>
          <Link href="/dashboard" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
            Dashboard
          </Link>
          {username && (
            <Link href={`/profile/${username}`} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              Profile
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              Log out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
