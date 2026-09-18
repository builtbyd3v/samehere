"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TEXT_LIMITS } from "@/lib/utils/validation";

export default function SearchBar({
  initialQuery = "",
  variant = "page",
  keep,
}: {
  initialQuery?: string;
  variant?: "nav" | "page";
  keep?: Record<string, string | null | undefined>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const empty = q.trim() === "";
  const kept = Object.entries(keep ?? {}).filter(([, value]) => Boolean(value));

  function hrefFor(query: string) {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    for (const [key, value] of kept) next.set(key, value as string);
    const qs = next.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty && kept.length === 0) return;
    router.push(hrefFor(q.trim()));
  }

  if (variant === "nav") {
    return (
      <form onSubmit={submit} className="nav-search hidden min-w-0 flex-1 justify-center px-4 md:flex" role="search">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition focus-within:border-[var(--border-strong)]">
          <button type="submit" disabled={empty} aria-label="Search" className="shrink-0 text-[var(--ink-muted)] transition hover:text-[var(--ink)] disabled:opacity-40">
            <Search strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            maxLength={TEXT_LIMITS.searchQuery}
            placeholder="Search people, projects, posts"
            aria-label="Search people, projects, and posts"
            className="min-w-0 flex-1 bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
          />
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2" role="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        maxLength={TEXT_LIMITS.searchQuery}
        placeholder="Search people, projects, posts"
        aria-label="Search people, projects, and posts"
        className="input-base w-full px-3 py-2 text-[15px]"
      />
      <button type="submit" disabled={empty && kept.length === 0} className="btn-primary shrink-0 disabled:opacity-40">
        Search
      </button>
    </form>
  );
}
