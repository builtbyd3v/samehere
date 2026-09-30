"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { countNewerPosts } from "./actions";
import { buttonClass } from "@/components/ui/Button";

export default function NewPostsPill({ since, label }: { since: string; label?: string }) {
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
      const n = await countNewerPosts(since, label);
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
  }, [since, label]);

  if (count <= 0) return null;

  return (
    <div className="sticky top-[108px] z-20 flex justify-center py-2 lg:top-[76px]">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        }}
        className={`new-posts-pill ${buttonClass("primary", "sm")}`}
      >
        {count} new post{count === 1 ? "" : "s"}
      </button>
    </div>
  );
}
