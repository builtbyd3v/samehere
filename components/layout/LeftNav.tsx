"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, House, MessageCircle, MessageCircleQuestion, Search, User } from "lucide-react";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import NavMenu from "./NavMenu";

export type ShellUser = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  stage: string | null;
  isPro: boolean;
  isAdmin: boolean;
};

function navActive(pathname: string, href: string, label: string) {
  if (href === "#") return false;
  if (label === "Home") return pathname === "/feed" || pathname.startsWith("/feed/");
  return pathname === href || pathname.startsWith(href + "/");
}

const ITEM = "flex h-9 items-center justify-between rounded-[9px] px-2.5 text-sm";
const ITEM_OFF = "text-[var(--muted)] hover:bg-[var(--fill-2)] hover:text-[var(--ink)]";
const ICON = { size: 17, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function LeftNav({
  user,
  dmUnread = 0,
  notifUnread = 0,
}: {
  user: ShellUser;
  dmUnread?: number;
  notifUnread?: number;
}) {
  const pathname = usePathname();

  const items: { label: string; href: string; icon: ReactNode; badge?: number; prefetch?: boolean }[] = [
    { label: "Home", href: "/feed", icon: <House {...ICON} /> },
    { label: "Search", href: "/search", icon: <Search {...ICON} /> },
    { label: "Messages", href: "/messages", icon: <MessageCircle {...ICON} />, badge: dmUnread },
    { label: "Notifications", href: "/notifications", icon: <Bell {...ICON} />, badge: notifUnread },
    { label: "Saved", href: "/saved", icon: <Bookmark {...ICON} />, prefetch: false },
    { label: "Profile", href: user.username ? `/profile/${user.username}` : "#", icon: <User {...ICON} /> },
  ];

  return (
    <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col gap-0.5">

      {items.map((item) => {
        const active = navActive(pathname, item.href, item.label);
        const badge = item.badge ?? 0;
        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch={item.prefetch}
            aria-current={active ? "page" : undefined}
            className={`${ITEM} ${active ? "bg-[var(--fill-3)] text-[var(--ink)]" : ITEM_OFF}`}
          >
            <span className="flex items-center gap-[11px]">
              {item.icon}
              {item.label}
            </span>
            {badge > 0 ? (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--accent)] px-1.5 text-meta font-semibold leading-none tabular-nums text-[var(--on-accent)]">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}

      <div className="grow" />

      <FeedbackButton className={`${ITEM} ${ITEM_OFF} w-full cursor-pointer`}>
        <span className="flex items-center gap-[11px]">
          <MessageCircleQuestion {...ICON} />
          Send feedback
        </span>
      </FeedbackButton>

      {user.username ? <NavMenu variant="card" user={user} /> : null}
    </nav>
  );
}
