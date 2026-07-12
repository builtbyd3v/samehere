"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconMail, IconCommunity } from "@/components/icons";

export default function MobileNav({
  username,
  dmUnread = 0,
  notifUnread = 0,
}: {
  username: string | null;
  dmUnread?: number;
  notifUnread?: number;
}) {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      href: "/feed",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      ),
    },
    { label: "Notifications", href: "/notifications", icon: <IconBell />, dot: notifUnread > 0 },
    { label: "Messages", href: "/messages", icon: <IconMail />, dot: dmUnread > 0 },
    { label: "Community", href: "/community", icon: <IconCommunity /> },
    {
      label: "Profile",
      href: username ? `/profile/${username}` : "#",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
  ].map((item) => ({
    ...item,
    active:
      item.label === "Home"
        ? pathname === "/feed" || pathname.startsWith("/feed/")
        : pathname === item.href || pathname.startsWith(item.href + "/"),
  }));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--canvas)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-label={item.label}
          className={`relative flex flex-1 items-center justify-center py-3 transition ${item.active ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}
        >
          {item.icon}
          {"dot" in item && item.dot ? (
            <span className="absolute right-[calc(50%-16px)] top-2 h-2 w-2 rounded-full bg-[var(--blue)] ring-2 ring-[var(--canvas)]" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
