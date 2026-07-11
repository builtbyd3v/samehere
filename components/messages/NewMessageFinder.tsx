"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startDmWithUsername, searchUsersForMessage, type MessageUserResult } from "@/app/(app)/messages/actions";
import { IconSearch } from "@/components/icons";
import { TEXT_LIMITS } from "@/lib/utils/validation";
import AvatarImage from "@/components/ui/AvatarImage";

export default function NewMessageFinder() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      const users = await searchUsersForMessage(query);
      setResults(users);
      setLoading(false);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  // Stale results shouldn't show once the query is cleared -- derive instead
  // of clearing `results` state from an effect.
  const visibleResults = query.trim() ? results : [];

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-4 py-3.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-[var(--ink-muted)]">
          <IconSearch />
        </span>
        New message
      </button>
    );
  }

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-[var(--ink-muted)]">
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students"
          maxLength={TEXT_LIMITS.dmUserSearch}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <button type="button" onClick={close} className="shrink-0 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]">
          Cancel
        </button>
      </div>
      {(loading || visibleResults.length > 0 || query.trim()) && (
        <ul className="max-h-52 overflow-y-auto border-t border-[var(--border)]">
          {loading && (
            <li className="px-4 py-3 text-sm text-[var(--ink-muted)]">Searching…</li>
          )}
          {!loading && query.trim() && visibleResults.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--ink-muted)]">No one found.</li>
          )}
          {visibleResults.map((u) => {
            const name = u.display_name ?? u.username;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => startTransition(() => startDmWithUsername(u.username))}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--featured-surface)]"
                >
                  {u.avatar_url ? (
                    <AvatarImage src={u.avatar_url} alt="" className="h-9 w-9 rounded-full border border-[var(--border)] object-cover" pro={u.is_pro} />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-[var(--ink)]">{name}</span>
                    <span className="ml-1.5 text-[var(--ink-muted)]">@{u.username}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
