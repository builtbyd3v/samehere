"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { countNewerPosts } from "./actions";

export default function NewPostsPill({ since }: { since: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  // Reset the count when the top post changes (fresh page load / refresh) — the
  // render-phase prop-change pattern, so we never call setState inside the effect.
  const [prevSince, setPrevSince] = useState(since);
  if (since !== prevSince) {
    setPrevSince(since);
    setCount(0);
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const n = await countNewerPosts(since);
      if (!cancelled) setCount(n);
    }

    const initial = setTimeout(poll, 3000);
    const interval = setInterval(poll, 25000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
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
