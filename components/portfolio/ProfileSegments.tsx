"use client";

import { useState, type ReactNode } from "react";

export type ProfileTab = "resume" | "posts" | "activity";
const LABELS: Record<ProfileTab, string> = { resume: "Resume", posts: "Posts", activity: "Activity" };

type ProfileSegmentsProps = { tabs: readonly ProfileTab[]; children: ReactNode };

// Phone only (below md). Panels stay server-rendered; the page hides the inactive ones with group-data classes.
// Button transitions come from the global `a, button` rule in app/globals.css.
export default function ProfileSegments({ tabs, children }: ProfileSegmentsProps) {
  const [tab, setTab] = useState<ProfileTab>("resume");
  return (
    <div className="group" data-tab={tab}>
      {tabs.length > 1 && (
        <div
          role="group"
          aria-label="Profile sections"
          className="mb-5 flex gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--surface-3)] p-[3px] md:hidden"
        >
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`h-11 flex-1 rounded-[9px] text-[13px] active:scale-[0.96] motion-reduce:active:scale-100 ${
                tab === t ? "bg-[#1a1c20] font-medium text-[var(--ink)]" : "text-[var(--muted)]"
              }`}
            >
              {LABELS[t]}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-10 md:gap-12 xl:gap-14">{children}</div>
    </div>
  );
}
