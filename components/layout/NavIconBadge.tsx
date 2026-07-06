"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBadgeCount } from "@/lib/notifications";

export default function NavIconBadge({
  href,
  title,
  count,
  poll,
  children,
}: {
  href: string;
  title: string;
  count: number;
  /** Optional server action returning the latest count; when set, polls every 60s and on focus. */
  poll?: () => Promise<number>;
  children: React.ReactNode;
}) {
  const [liveCount, setLiveCount] = useState(count);
  useEffect(() => setLiveCount(count), [count]);

  useEffect(() => {
    if (!poll) return;
    const refresh = () => {
      if (document.hidden) return;
      poll().then(setLiveCount).catch(() => {});
    };
    const id = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, [poll]);

  const badge = formatBadgeCount(liveCount);
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={`relative grid h-9 w-9 place-items-center rounded-full transition active:scale-95 ${
        active ? "bg-[var(--featured-surface)] text-[var(--ink)]" : "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] animate-[badge-pop_260ms_ease] place-items-center rounded-full bg-[var(--blue)] px-1 py-0.5 text-[10px] font-semibold leading-none text-white motion-reduce:animate-none">
          {badge}
        </span>
      )}
    </Link>
  );
}
