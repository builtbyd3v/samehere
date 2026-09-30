import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import AppBrand from "@/components/brand/AppBrand";
import NavMenu from "./NavMenu";
import type { ShellUser } from "./LeftNav";
import { getUnreadCounts } from "@/lib/unread";
import { signupCtaSm, ghostCtaSm } from "@/components/landing/cta";

function NotifBell({ unread }: { unread: boolean }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? "Notifications, unread" : "Notifications"}
      className="relative grid size-11 place-items-center text-[var(--ink)]"
    >
      <Bell size={20} strokeWidth={1.6} aria-hidden />
      {unread ? <span className="absolute right-2.5 top-2.5 size-[7px] rounded-full bg-[var(--accent)]" aria-hidden /> : null}
    </Link>
  );
}

async function NotifBellLive() {
  const { notif } = await getUnreadCounts();
  return <NotifBell unread={notif > 0} />;
}

export default function Navbar({ user }: { user: ShellUser }) {
  if (user.username) {
    // Signed in: phone header only. Desktop chrome is the left nav.
    return (
      <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--bg)]/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-2">
          <NavMenu variant="avatar" user={user} />
          <div className="flex justify-center">
            <AppBrand href="/feed" />
          </div>
          <Suspense fallback={<NotifBell unread={false} />}>
            <NotifBellLive />
          </Suspense>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/85 backdrop-blur-md">
      <nav className="app-nav brand-header-bar">
        <div className="flex items-center gap-2">
          <AppBrand href="/" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" prefetch className={ghostCtaSm}>
            Sign in
          </Link>
          <Link href="/signup" prefetch className={signupCtaSm}>
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
