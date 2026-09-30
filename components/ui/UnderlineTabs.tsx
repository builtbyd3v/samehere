import Link from "next/link";
import type { ReactNode } from "react";

export type UnderlineTab = {
  href: string;
  label: ReactNode;
  count?: number;
  countTone?: "amber" | "muted";
};

/** Link tabs with a 1.5px ink underline on the active one. 44px tall on phones, 64px from `md`. */
export function UnderlineTabs({
  tabs,
  activeHref,
  label,
  className = "",
}: {
  tabs: readonly UnderlineTab[];
  activeHref: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={`flex gap-5 overflow-x-auto [scrollbar-width:none] md:gap-6 ${className}`.trim()}>
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center whitespace-nowrap text-body md:h-16 ${
              active
                ? "font-medium text-[var(--ink)] shadow-[inset_0_-1.5px_0_var(--ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
            {tab.count ? (
              <span
                className={`ml-1.5 text-xs tabular-nums ${tab.countTone === "amber" ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
