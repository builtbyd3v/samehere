"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MessageCircle, Settings, User, UserPlus } from "lucide-react";
import { IconBell, IconMail, IconBookmark, IconBolt, IconSearch } from "@/components/icons";
import FeedbackButton from "@/components/feedback/FeedbackButton";

function navActive(pathname: string, href: string, label: string) {
  if (href === "#") return false;
  if (label === "Feed") return pathname === "/feed" || pathname.startsWith("/feed/");
  return pathname === href || pathname.startsWith(href + "/");
}

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
  const reduceMotion = useReducedMotion();

  const primary = [
    {
      label: "Feed",
      href: "/feed",
      icon: <House size={20} strokeWidth={1.5} aria-hidden />,
    },
    { label: "Messages", href: "/messages", icon: <IconMail />, badge: dmUnread },
    {
      label: "Profile",
      href: username ? `/profile/${username}` : "#",
      icon: <User size={20} strokeWidth={1.5} aria-hidden />,
    },
    { label: "Search", href: "/search", icon: <IconSearch /> },
    { label: "Notifications", href: "/notifications", icon: <IconBell />, badge: notifUnread },
  ];

  const secondary = [
    { label: "Saved", href: "/saved", icon: <IconBookmark />, prefetch: false },
    { label: "Pro", href: "/pro", icon: <IconBolt className="h-5 w-5" />, prefetch: false },
    {
      label: "Invite friends",
      href: "/referrals",
      icon: <UserPlus size={20} strokeWidth={1.5} aria-hidden />,
      prefetch: false,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings size={20} strokeWidth={1.5} aria-hidden />,
      prefetch: false,
    },
  ];

  function renderItem(
    item: {
      label: string;
      href: string;
      icon: ReactNode;
      badge?: number;
      prefetch?: boolean;
    },
    opts?: { proDot?: boolean },
  ) {
    const active = navActive(pathname, item.href, item.label);
    const badge = item.badge ?? 0;

    return (
      <Link
        key={item.label}
        href={item.href}
        prefetch={item.prefetch}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-3.5 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors duration-[var(--dur-micro)] ease-out hover:bg-[var(--featured-surface)] ${active ? "bg-[var(--accent-blue-soft)] font-semibold text-[var(--blue)]" : "text-[var(--ink)]"}`}
      >
        {active ? (
          reduceMotion ? (
            <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-[var(--blue)]" aria-hidden />
          ) : (
            <motion.span
              layoutId="shell-nav-active"
              className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-[var(--blue)]"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
          )
        ) : null}
        <span className={`grid h-6 w-6 shrink-0 place-items-center transition-colors duration-[var(--dur-micro)] ${active ? "text-[var(--blue)]" : "text-[var(--ink-muted)]"}`}>
          {item.icon}
        </span>
        {item.label}
        {badge > 0 ? (
          <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--blue)] px-1.5 text-xs font-semibold text-white tabular-nums">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : opts?.proDot ? (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]" />
        ) : null}
      </Link>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {primary.map((item) => renderItem(item))}

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        {secondary.map((item) => renderItem(item, { proDot: item.label === "Pro" && !isPro }))}
      </div>

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <FeedbackButton className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--featured-surface)] px-4 py-3 text-left text-[var(--ink)] transition duration-200 ease-out hover:bg-[var(--accent-blue-soft)] active:scale-[0.98]">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center text-[var(--blue)]">
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold leading-tight">Send feedback</span>
            <span className="text-xs leading-tight text-[var(--ink-muted)]">Found a bug? Tell us.</span>
          </span>
        </FeedbackButton>
      </div>
    </nav>
  );
}
