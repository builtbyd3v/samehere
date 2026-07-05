"use client";

import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import type { MentionSuggestion } from "@/lib/profile-preview";

export default function MentionSuggestionList({
  suggestions,
  highlight,
  onPick,
  onHover,
}: {
  suggestions: MentionSuggestion[];
  highlight: number;
  onPick: (username: string) => void;
  onHover: (index: number) => void;
}) {
  return (
    <ul
      role="listbox"
      className="card absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto py-1 shadow-lg motion-safe:[animation:menu-pop_150ms_ease-out] sm:right-auto sm:min-w-[240px] sm:max-w-[min(320px,calc(100vw-2rem))]"
    >
      {suggestions.map((s, i) => {
        const name = s.display_name ?? s.username;
        return (
          <li key={s.username} role="option" aria-selected={i === highlight}>
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onClick={() => onPick(s.username)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition active:scale-[0.99] ${
                i === highlight ? "bg-[var(--featured-surface)]" : "hover:bg-[var(--featured-surface)]"
              }`}
            >
              {s.avatar_url ? (
                <AvatarImage
                  src={s.avatar_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1 font-medium text-[var(--ink)]">
                  {name}
                  <UserBadges isPro={s.is_pro} isFounder={s.is_founder} />
                </span>
                <span className="block text-[var(--ink-muted)]">@{s.username}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
