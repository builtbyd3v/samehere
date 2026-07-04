import Link from "next/link";
import NavMenu from "./NavMenu";
import NavIconBadge from "./NavIconBadge";
import { IconBell, IconBolt, IconMail } from "@/components/icons";

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
        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          {username && (
            <>
              <NavIconBadge href="/messages" title="Messages" count={dmUnread}>
                <IconMail />
              </NavIconBadge>
              <NavIconBadge href="/notifications" title="Notifications" count={notificationUnread}>
                <IconBell />
              </NavIconBadge>
            </>
          )}
          {!isPro && (
            <Link href="/pro" className="font-medium text-[var(--blue)] transition hover:opacity-80">
              Join Pro
            </Link>
          )}
          {username && <NavMenu username={username} avatarUrl={avatarUrl} />}
        </div>
      </nav>
    </header>
  );
}
