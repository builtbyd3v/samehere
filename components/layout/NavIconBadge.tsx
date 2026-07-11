"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBadgeCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

export default function NavIconBadge({
  href,
  title,
  count,
  poll,
  realtimeTable,
  children,
}: {
  href: string;
  title: string;
  count: number;
  /** Optional server action returning the latest count; when set, polls every 60s and on focus. */
  poll?: () => Promise<number>;
  /** Optional table name; when set with `poll`, subscribes to Realtime INSERTs (RLS-gated, own rows only) and re-polls on event. */
  realtimeTable?: string;
  children: React.ReactNode;
}) {
  const [liveCount, setLiveCount] = useState(count);
  useEffect(() => setLiveCount(count), [count]);
  const [supabase] = useState(createClient);

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

  useEffect(() => {
    if (!poll || !realtimeTable) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`nav-badge-${realtimeTable}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: realtimeTable },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            poll().then(setLiveCount).catch(() => {});
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [poll, realtimeTable, supabase]);

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
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] animate-[badge-pop_260ms_var(--ease-out)] place-items-center rounded-full bg-[var(--blue)] px-1 py-0.5 text-[10px] font-semibold leading-none text-white motion-reduce:animate-none">
          {badge}
        </span>
      )}
    </Link>
  );
}
