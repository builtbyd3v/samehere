"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconMail, IconCommunity, IconBookmark, IconBolt, IconBriefcase } from "@/components/icons";
import FeedbackButton from "@/components/feedback/FeedbackButton";

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
    { label: "Pro", href: "/pro", icon: <IconBolt /> },
  ];

  return (
    <nav className="flex flex-col gap-1">
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
            className={`relative flex items-center gap-3.5 rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors duration-200 ease-out hover:bg-[var(--featured-surface)] ${active ? "bg-[var(--blue-glow)] font-semibold text-[var(--blue)]" : "text-[var(--ink)]"}`}
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

      {/* Not a nav item, so it breaks every nav-item rule: a bordered card
          instead of a transparent pill, squared corners instead of rounded-full,
          and a subtitle. Mirrors the "Invite friends" card in NavMenu. A solid
          blue fill was the first try -- white/--canvas label on --blue only
          reaches 4.16:1, under AA, and --blue is too light in dark mode to
          carry white text at all. Accent-on-surface clears AA in both themes. */}
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <FeedbackButton className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[var(--blue)] bg-[var(--featured-surface)] px-4 py-3 text-left text-[var(--ink)] transition duration-200 ease-out hover:bg-[var(--blue-glow)] active:scale-[0.98]">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center text-[var(--blue)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.7-4.4A8.4 8.4 0 0 1 4 11.6a8.4 8.4 0 0 1 8.5-8.4h.5a8.4 8.4 0 0 1 8 8.3Z" />
            </svg>
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
