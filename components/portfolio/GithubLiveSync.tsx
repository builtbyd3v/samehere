"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GITHUB_REFRESH_PATH } from "@/lib/github/config";

function syncedLabel(lastSyncedAt: string | null, now: number | null): string {
  if (!lastSyncedAt || now === null) return "Live";
  const secs = Math.max(0, Math.floor((now - new Date(lastSyncedAt).getTime()) / 1000));
  if (secs < 60) return "Live · synced just now";
  if (secs < 3600) return `Live · synced ${Math.floor(secs / 60)}m ago`;
  return `Live · synced ${Math.floor(secs / 3600)}h ago`;
}

export default function GithubLiveSync({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter();
  // note: null until the first poll so server and client render the same text
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    async function poll() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch(GITHUB_REFRESH_PATH, { method: "POST" });
        if (stopped) return;
        setNow(Date.now());
        if (res.ok) router.refresh();
        else if (res.status !== 429) stop();
      } catch {
        // note: network blips are retried on the next tick
      } finally {
        inFlight = false;
      }
    }

    const initial = setTimeout(poll, 2000);
    const interval = setInterval(poll, 60_000);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    function stop() {
      stopped = true;
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return stop;
  }, [router]);

  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)] motion-safe:animate-pulse" />
      {/* note: label updates once per poll; no extra clock timer */}
      {syncedLabel(lastSyncedAt, now)}
    </span>
  );
}
