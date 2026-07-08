import Link from "next/link";
import NavMenu from "./NavMenu";
import NavIconBadge from "./NavIconBadge";
import { IconBell, IconBolt, IconCrown, IconMail, IconSearch } from "@/components/icons";
import { getNotificationUnreadCount } from "@/app/(app)/notifications/actions";

export default function Navbar({
  username,
  avatarUrl,
  isPro,
  isAdmin,
  dmUnread,
  notificationUnread,
}: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  isAdmin: boolean;
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
              <Link
                href="/feed?search=1"
                title="Search"
                aria-label="Search students"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
              >
                <IconSearch />
              </Link>
              <NavIconBadge href="/leaderboard" title="Leaderboard" count={0}>
                <IconCrown className="h-5 w-5" />
              </NavIconBadge>
              <NavIconBadge href="/messages" title="Messages" count={dmUnread}>
                <IconMail />
              </NavIconBadge>
              <NavIconBadge href="/notifications" title="Notifications" count={notificationUnread} poll={getNotificationUnreadCount} realtimeTable="notifications">
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
          {username && <NavMenu username={username} avatarUrl={avatarUrl} isAdmin={isAdmin} />}
        </div>
      </nav>
    </header>
  );
}
