"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { PathProject } from "@/lib/path/types";
import { saveProjectChecklist } from "@/app/(app)/projects/actions";
import ProjectCompletionPanel from "@/components/path/ProjectCompletionPanel";
import type { DossierExperienceDraft } from "@/lib/path/dossier-draft";

type Item = PathProject["build_checklist"][number];
type ChecklistState = Record<string, boolean>;

function hasServerChecklist(state?: ChecklistState): state is ChecklistState {
  return !!state && Object.keys(state).length > 0;
}

function readLocalChecklist(storageKey: string): ChecklistState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as ChecklistState;
  } catch {
    return null;
  }
}

/** Client-only flag without setState-in-effect; SSR/hydration snapshot stays false. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ProjectChecklist({
  projectSlug,
  items,
  initialDone,
  persistServer = false,
  dossierDraft,
  inDossier = false,
}: {
  projectSlug: string;
  items: Item[];
  /** Server checklist_state when logged in; preferred over localStorage. */
  initialDone?: ChecklistState;
  /** When true, toggles upsert user_projects (logged-in viewers). */
  persistServer?: boolean;
  dossierDraft: DossierExperienceDraft;
  inDossier?: boolean;
}) {
  const router = useRouter();
  const storageKey = `path-project-checklist:${projectSlug}`;
  const isClient = useIsClient();
  const [done, setDone] = useState<ChecklistState>(initialDone ?? {});
  /** Tracks which storage key has applied client hydrate (server or localStorage). */
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [prevInitialDone, setPrevInitialDone] = useState(initialDone);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefer server state when it arrives/changes (e.g. after refresh). Render-time
  // adjust — not an effect — so we avoid react-hooks/set-state-in-effect.
  if (initialDone !== prevInitialDone) {
    setPrevInitialDone(initialDone);
    if (hasServerChecklist(initialDone)) {
      setDone(initialDone);
    }
  }

  // One client hydrate per storage key: server wins; else localStorage fallback.
  if (isClient && hydratedKey !== storageKey) {
    setHydratedKey(storageKey);
    if (hasServerChecklist(initialDone)) {
      setDone(initialDone);
    } else {
      const local = readLocalChecklist(storageKey);
      if (local) setDone(local);
      else setDone(initialDone ?? {});
    }
  }

  // Mirror preferred server state into localStorage (write-only; no setState).
  useEffect(() => {
    if (!hasServerChecklist(initialDone)) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialDone));
    } catch {
      /* ignore quota */
    }
  }, [initialDone, storageKey]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function persist(next: ChecklistState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
    if (!persistServer) return;

    const requiredItems = items.filter((i) => !i.optional);
    const markDone =
      requiredItems.length > 0 && requiredItems.every((i) => next[i.id]);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveProjectChecklist(projectSlug, next, markDone).then((result) => {
        if (result.firstCompletion) router.refresh();
      });
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
  const allRequiredDone = required.length > 0 && requiredDone === required.length;

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

        {allRequiredDone ? (
          <ProjectCompletionPanel
            draft={dossierDraft}
            inDossier={inDossier}
            projectSlug={projectSlug}
            persistServer={persistServer}
          />
        ) : null}
      </div>
    </section>
  );
}
