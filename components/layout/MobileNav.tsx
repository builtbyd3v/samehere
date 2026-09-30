"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, House, MessageCircle, Search, User } from "lucide-react";

const ICON = { size: 22, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function MobileNav({ username, dmUnread = 0 }: { username: string | null; dmUnread?: number }) {
  const pathname = usePathname();

  const items = [
    { label: "Home", href: "/feed", icon: <House {...ICON} /> },
    { label: "Search", href: "/search", icon: <Search {...ICON} /> },
    { label: "Messages", href: "/messages", icon: <MessageCircle {...ICON} />, badge: dmUnread },
    { label: "Saved", href: "/saved", icon: <Bookmark {...ICON} /> },
    { label: "Profile", href: username ? `/profile/${username}` : "#", icon: <User {...ICON} /> },
  ].map((item) => ({
    ...item,
    active:
      item.label === "Home"
        ? pathname === "/feed" || pathname.startsWith("/feed/")
        : item.href !== "#" && (pathname === item.href || pathname.startsWith(item.href + "/")),
  }));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--hairline)] bg-[var(--bg)]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] ${item.active ? "text-[var(--accent-2)]" : "text-[var(--faint)]"}`}
        >
          <span className={`grid h-7 w-14 place-items-center rounded-full${item.active ? " bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}>
            {item.icon}
          </span>
          {item.label}
          {item.badge ? (
            <span className="absolute left-[calc(50%+4px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold leading-none tabular-nums text-[var(--on-accent)]">
              <span aria-hidden>{item.badge > 99 ? "99+" : item.badge}</span>
              <span className="sr-only">, unread</span>
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
