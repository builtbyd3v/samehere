import Link from "next/link";
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

  return (
    <Link
      href={href}
      title={title}
      className="relative grid h-9 w-9 place-items-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
    >
      {children}
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-[var(--blue)] px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
