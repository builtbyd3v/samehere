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
  variant?: "rail" | "page";
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

  if (variant === "rail") {
    return (
      <form
        onSubmit={submit}
        role="search"
        className="flex h-[38px] items-center gap-2.5 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-3)] px-3 text-[13px] focus-within:border-[var(--hairline-strong)]"
      >
        <button type="submit" disabled={empty} aria-label="Search" className="shrink-0 text-[var(--faint)] hover:text-[var(--ink)] disabled:opacity-100">
          <Search size={15} strokeWidth={1.7} aria-hidden />
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          maxLength={TEXT_LIMITS.searchQuery}
          placeholder="Search"
          aria-label="Search people, projects, and posts"
          className="min-w-0 flex-1 bg-transparent text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none"
        />
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
