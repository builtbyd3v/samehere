"use client";

import { useEffect, useState } from "react";
import type { PathProject } from "@/lib/path/types";

type Item = PathProject["build_checklist"][number];

export default function ProjectChecklist({
  projectSlug,
  items,
}: {
  projectSlug: string;
  items: Item[];
}) {
  const storageKey = `path-project-checklist:${projectSlug}`;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // TODO: persist checklist_state to user_projects when auth path wiring lands
  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  const completed = items.filter((i) => done[i.id]).length;
  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => done[i.id]).length;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="build-checklist-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="build-checklist-heading" className="text-lg font-semibold text-[var(--ink)]">
            Build checklist
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Work these steps in-app. This is the primary path — not an external tutorial.
          </p>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {completed}/{items.length} · {requiredDone}/{required.length} required
        </p>
      </div>

      <ul className="mt-5 space-y-2">
        {items.map((item) => {
          const checked = !!done[item.id];
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] px-3 py-3 hover:border-[var(--border-strong)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--blue)]"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className={`text-sm ${checked ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}>
                    {item.title}
                  </span>
                  {item.optional && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-[var(--ink-faint)]">optional</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
