"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEXT_LIMITS } from "@/lib/utils/validation";

// One search input reused by the top nav and the /search page. Client-side so
// the submit button can disable on an empty query and the Smart pill can show a
// clear on/off state (this project's Tailwind does not compile peer-checked:*,
// so the on-state colors are inline). Smart on → mode=smart, which opens the
// People results straight into AI mode on /search.
const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

export default function SearchBar({
  initialQuery = "",
  initialSmart = false,
  variant = "page",
}: {
  initialQuery?: string;
  initialSmart?: boolean;
  variant?: "nav" | "page";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [smart, setSmart] = useState(initialSmart);
  const empty = q.trim() === "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty) return;
    const p = new URLSearchParams({ q: q.trim() });
    if (smart) p.set("mode", "smart");
    router.push(`/search?${p.toString()}`);
  }

  const smartPill = (
    <button
      type="button"
      role="switch"
      aria-checked={smart}
      onClick={() => setSmart((s) => !s)}
      title="Toggle AI natural-language people search"
      className={`shrink-0 whitespace-nowrap rounded-full border font-medium transition ${
        variant === "nav" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      style={
        smart
          ? { backgroundColor: "var(--blue)", color: "#fff", borderColor: "transparent" }
          : { backgroundColor: "transparent", color: "var(--ink-muted)", borderColor: "var(--border)" }
      }
    >
      ✦ Smart{smart ? " · on" : ""}
    </button>
  );

  if (variant === "nav") {
    return (
      <form onSubmit={submit} className="nav-search hidden min-w-0 flex-1 justify-center px-4 md:flex">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm transition focus-within:border-[var(--border-strong)]">
          <button type="submit" disabled={empty} aria-label="Search" className="shrink-0 text-[var(--ink-muted)] transition hover:text-[var(--ink)] disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            maxLength={TEXT_LIMITS.searchQuery}
            placeholder="Search people, posts, and clubs"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
          />
          {smartPill}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={TEXT_LIMITS.searchQuery}
        placeholder="Search people, posts, and clubs"
        className={inputCls}
      />
      {smartPill}
      <button type="submit" disabled={empty} className="btn-primary shrink-0 disabled:opacity-40">
        Search
      </button>
    </form>
  );
}
