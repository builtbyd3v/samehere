"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatBadgeCount } from "@/lib/notifications";

export default function NavIconBadge({
  href,
  title,
  count,
  children,
}: {
  href: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const badge = formatBadgeCount(count);
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
