"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { countNewerPosts } from "./actions";

export default function NewPostsPill({ since }: { since: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  // Reset the count whenever `since` changes (e.g. the feed's baseline moves
  // forward), computed during render rather than a synchronous setState in
  // the effect below -- same pattern as TabTitleNotifier's prevTotal resync.
  const [prevSince, setPrevSince] = useState(since);
  if (since !== prevSince) {
    setPrevSince(since);
    setCount(0);
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.hidden) return;
      const n = await countNewerPosts(since);
      if (!cancelled) setCount(n);
    }

    const initial = setTimeout(poll, 3000);
    const interval = setInterval(poll, 25000);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [since]);

  if (count <= 0) return null;

  return (
    <div className="sticky top-16 z-20 flex justify-center">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        }}
        className="btn-tap rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-1.5 text-sm font-medium text-[var(--blue)] shadow-paper transition hover:brightness-105"
      >
        {count} new post{count === 1 ? "" : "s"}
      </button>
    </div>
  );
}
