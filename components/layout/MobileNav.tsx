"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, User } from "lucide-react";
import { IconBell, IconMail, IconSearch } from "@/components/icons";

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
      label: "Feed",
      href: "/feed",
      icon: <House size={22} strokeWidth={1.5} aria-hidden />,
      prefetch: true as boolean,
    },
    { label: "Search", href: "/search", icon: <IconSearch />, prefetch: true },
    { label: "Messages", href: "/messages", icon: <IconMail />, dot: dmUnread > 0, prefetch: true },
    { label: "Notifications", href: "/notifications", icon: <IconBell />, dot: notifUnread > 0, prefetch: true },
    {
      label: "Profile",
      href: username ? `/profile/${username}` : "#",
      icon: <User size={22} strokeWidth={1.5} aria-hidden />,
      prefetch: Boolean(username),
    },
  ].map((item) => ({
    ...item,
    active:
      item.label === "Feed"
        ? pathname === "/feed" || pathname.startsWith("/feed/")
        : pathname === item.href || pathname.startsWith(item.href + "/"),
  }));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--canvas)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          prefetch={item.prefetch}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          className={`relative flex min-h-11 flex-1 items-center justify-center py-3 transition-colors duration-[var(--dur-micro)] ease-out ${item.active ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}
        >
          {item.active && (
            <span
              aria-hidden
              className="pointer-events-none absolute h-8 w-8 rounded-full blur-md"
              style={{ background: "var(--blue-glow)" }}
            />
          )}
          <span className="relative">{item.icon}</span>
          {"dot" in item && item.dot ? (
            <span className="absolute right-[calc(50%-16px)] top-2 h-2 w-2 rounded-full bg-[var(--blue)] ring-2 ring-[var(--canvas)]" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
