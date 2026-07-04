"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startDmWithUsername, searchUsersForMessage, type MessageUserResult } from "@/app/(app)/messages/actions";
import AvatarImage from "@/components/ui/AvatarImage";

export default function NewMessageFinder() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, startTransition] = useTransition();
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      const users = await searchUsersForMessage(query);
      setResults(users);
      setLoading(false);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  return (
    <div className="mb-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-inset w-full rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--featured-surface)]"
        >
          New message
        </button>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--ink)]">To:</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
              className="text-xs text-[var(--ink-muted)] underline"
            >
              Cancel
            </button>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username"
            autoFocus
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)]"
          />
          {loading && <p className="mt-2 text-xs text-[var(--ink-muted)]">Searching…</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="mt-2 text-xs text-[var(--ink-muted)]">No students found.</p>
          )}
          {results.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {results.map((u) => {
                const name = u.display_name ?? u.username;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={starting}
                      onClick={() => startTransition(() => startDmWithUsername(u.username))}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--featured-surface)] disabled:opacity-50"
                    >
                      {u.avatar_url ? (
                        <AvatarImage
                          src={u.avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full border border-[var(--border)] object-cover"
                        />
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
      )}
    </div>
  );
}
