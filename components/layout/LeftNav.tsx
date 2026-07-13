"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconMail, IconCommunity, IconBookmark, IconBolt, IconBriefcase } from "@/components/icons";

export default function LeftNav({
  username,
  isPro,
  dmUnread = 0,
  notifUnread = 0,
}: {
  username: string | null;
  isPro: boolean;
  dmUnread?: number;
  notifUnread?: number;
}) {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      href: "/feed",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      ),
    },
    { label: "Notifications", href: "/notifications", icon: <IconBell />, badge: notifUnread },
    { label: "Messages", href: "/messages", icon: <IconMail />, badge: dmUnread },
    { label: "Community", href: "/community", icon: <IconCommunity /> },
    { label: "Jobs", href: "/jobs", icon: <IconBriefcase /> },
    { label: "Saved", href: "/saved", icon: <IconBookmark /> },
    {
      label: "Profile",
      href: username ? `/profile/${username}` : "#",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
    { label: "Pro", href: "/pro", icon: <IconBolt /> },
  ];

  return (
    <nav className="card p-2">
      {items.map((item) => {
        const active =
          item.href === "#"
            ? false
            : item.label === "Home"
              ? pathname === "/feed" || pathname.startsWith("/feed/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
        const badge = ("badge" in item ? item.badge : 0) ?? 0;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3.5 rounded-full px-3 py-2.5 text-[15px] font-medium transition hover:bg-[var(--featured-surface)] ${active ? "text-[var(--blue)] font-semibold" : "text-[var(--ink)]"}`}
          >
            <span className={`grid h-6 w-6 shrink-0 place-items-center ${active ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}>
              {item.icon}
            </span>
            {item.label}
            {badge > 0 ? (
              <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--blue)] px-1.5 text-xs font-semibold text-white tabular-nums">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : item.label === "Pro" && !isPro ? (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
