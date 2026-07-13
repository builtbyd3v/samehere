"use client";

import AvatarBase from "@/components/ui/Avatar";
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
              <AvatarBase
                src={s.avatar_url}
                seed={s.username}
                name={name}
                className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] text-xs"
                pro={s.is_pro}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1 font-medium text-[var(--ink)]">
                  {name}
                  <UserBadges isPro={s.is_pro} isFounder={s.is_founder} isCampusFounder={s.is_campus_founder} isVerifiedStudent={s.verified_student} />
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
