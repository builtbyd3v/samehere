import Link from "next/link";
import NavMenu from "./NavMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { IconBolt } from "@/components/icons";

// Server component — top-level stays plain links (no client JS); the avatar
// dropdown is the one client island (NavMenu).
export default function Navbar({
  username,
  avatarUrl,
  isPro,
}: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Link href="/feed" className="font-semibold tracking-[-0.02em]">
            samehere
          </Link>
          {isPro && (
            <Link
              href="/pro"
              title="Pro"
              className="text-[var(--blue)] transition hover:opacity-80"
            >
              <IconBolt className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle compact />
          {!isPro && (
            <Link href="/pro" className="font-medium text-[var(--blue)] transition hover:opacity-80">
              Join Pro
            </Link>
          )}
          {/* notifications bell slots in here next (Phase 14) */}
          {username && <NavMenu username={username} avatarUrl={avatarUrl} />}
        </div>
      </nav>
    </header>
  );
}
