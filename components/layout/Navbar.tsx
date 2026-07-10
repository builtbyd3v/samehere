import Link from "next/link";
import NavMenu from "./NavMenu";
import NavIconBadge from "./NavIconBadge";
import { IconBell, IconBolt, IconMail, IconCommunity } from "@/components/icons";
import { getNotificationUnreadCount } from "@/app/(app)/notifications/actions";
import { signupCtaSm, ghostCtaSm } from "@/components/landing/cta";

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
        {username ? (
          <div className="flex items-center gap-1 text-sm sm:gap-1.5">
            <NavIconBadge href="/community" title="Community" count={0}>
              <IconCommunity className="h-5 w-5" />
            </NavIconBadge>
            <NavIconBadge href="/messages" title="Messages" count={dmUnread}>
              <IconMail />
            </NavIconBadge>
            <NavIconBadge href="/notifications" title="Notifications" count={notificationUnread} poll={getNotificationUnreadCount} realtimeTable="notifications">
              <IconBell />
            </NavIconBadge>
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
