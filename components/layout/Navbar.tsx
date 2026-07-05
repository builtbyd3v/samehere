import Link from "next/link";
import NavMenu from "./NavMenu";
import NavIconBadge from "./NavIconBadge";
import { IconBell, IconBolt, IconCrown, IconMail } from "@/components/icons";

export default function Navbar({
  username,
  avatarUrl,
  isPro,
  dmUnread,
  notificationUnread,
}: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  dmUnread: number;
  notificationUnread: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Link href="/feed" className="font-semibold tracking-[-0.02em] transition hover:opacity-80">
            samehere
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
        <div className="flex items-center gap-1 text-sm sm:gap-1.5">
          {username && (
            <>
              <NavIconBadge href="/leaderboard" title="Leaderboard" count={0}>
                <IconCrown className="h-5 w-5" />
              </NavIconBadge>
              <NavIconBadge href="/messages" title="Messages" count={dmUnread}>
                <IconMail />
              </NavIconBadge>
              <NavIconBadge href="/notifications" title="Notifications" count={notificationUnread}>
                <IconBell />
              </NavIconBadge>
            </>
          )}
          {!isPro && (
            <Link
              href="/pro"
              className="rounded-full px-2.5 py-1 font-medium text-[var(--blue)] transition hover:bg-[var(--featured-surface)]"
            >
              Join Pro
            </Link>
          )}
          {username && <NavMenu username={username} avatarUrl={avatarUrl} />}
        </div>
      </nav>
    </header>
  );
}
