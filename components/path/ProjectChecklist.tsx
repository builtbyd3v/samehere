"use client";

import { useEffect, useRef, useState } from "react";
import type { PathProject } from "@/lib/path/types";
import { saveProjectChecklist } from "@/app/(app)/projects/actions";

type Item = PathProject["build_checklist"][number];

export default function ProjectChecklist({
  projectSlug,
  items,
  initialDone,
  persistServer = false,
}: {
  projectSlug: string;
  items: Item[];
  /** Server checklist_state when logged in; preferred over localStorage. */
  initialDone?: Record<string, boolean>;
  /** When true, toggles upsert user_projects (logged-in viewers). */
  persistServer?: boolean;
}) {
  const storageKey = `path-project-checklist:${projectSlug}`;
  const [done, setDone] = useState<Record<string, boolean>>(initialDone ?? {});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    // Prefer server state; localStorage is offline cache fallback only.
    if (initialDone && Object.keys(initialDone).length > 0) {
      setDone(initialDone);
      try {
        localStorage.setItem(storageKey, JSON.stringify(initialDone));
      } catch {
        /* ignore quota */
      }
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [initialDone, storageKey]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function persist(next: Record<string, boolean>) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
    if (!persistServer) return;

    const required = items.filter((i) => !i.optional);
    const markDone = required.length > 0 && required.every((i) => next[i.id]);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveProjectChecklist(projectSlug, next, markDone);
    }, 400);
  }

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(next);
      return next;
    });
  }

  const completed = items.filter((i) => done[i.id]).length;
  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => done[i.id]).length;

  return (
    <section
      className="landing-xai-card-hover rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      aria-labelledby="build-checklist-heading"
    >
      <div className="landing-xai-card-content">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="build-checklist-heading"
              className="text-lg font-medium tracking-[-0.02em] text-[var(--ink)]"
            >
              Build checklist
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Work these steps in-app. This is the primary path — not an external tutorial.
            </p>
          </div>
          <p className="text-sm tabular-nums text-[var(--accent-blue-strong)]">
            {completed}/{items.length} · {requiredDone}/{required.length} required
          </p>
        </div>

        <ul className="mt-5 space-y-2">
          {items.map((item) => {
            const checked = !!done[item.id];
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--landing-radius-sm)] border border-[var(--border)] px-3 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--featured-surface)]">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--accent-blue)]"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`text-sm ${checked ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}
                    >
                      {item.title}
                    </span>
                    {item.optional && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-[var(--ink-faint)]">
                        optional
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
