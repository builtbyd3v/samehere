"use client";

import { type ReactNode, useState } from "react";

type Tab = "chat" | "members" | "announcements" | "about";

const TABS: { key: Tab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "members", label: "Members" },
  { key: "announcements", label: "Announcements" },
  { key: "about", label: "About" },
];

const pill = "rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97]";

// All four panels stay mounted at once -- only the inactive ones get
// `hidden` -- so ClubChat's realtime subscription + scroll position survive
// switching away and back (a conditional unmount would tear the socket down
// and drop scroll every time).
export default function ClubTabs({
  defaultTab,
  chat,
  members,
  announcements,
  about,
}: {
  defaultTab: Tab;
  chat: ReactNode;
  members: ReactNode;
  announcements: ReactNode;
  about: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const panels: Record<Tab, ReactNode> = { chat, members, announcements, about };

  return (
    <div className="mt-4">
      <div
        className="inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
        role="tablist"
        aria-label="Club"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? `${pill} bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]`
                : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div key={t.key} hidden={tab !== t.key} className="mt-4">
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
