"use client";

import { useActionState, useState, useTransition } from "react";
import { addExperience, deleteExperience, type ExperienceState } from "@/app/(app)/profile/edit/actions";
import Select from "@/components/ui/Select";

export type ExperienceEntry = {
  id: string;
  kind: string;
  org: string;
  role: string;
  term: string | null;
  note: string | null;
};

const KIND_OPTIONS: [string, string][] = [
  ["internship", "Internship"],
  ["job", "Job"],
  ["research", "Research"],
  ["club_role", "Club role"],
];
const KIND_SELECT_OPTIONS = [
  { value: "", label: "Select type" },
  ...KIND_OPTIONS.map(([value, label]) => ({ value, label })),
];

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

// Separate concern from EditProfileForm — its own card, its own server
// actions, no drag-reorder or edit-in-place (delete + re-add covers v1).
// Both actions revalidatePath the edit page, so the list here is rendered
// straight off the `initial` prop rather than duplicated into local state —
// a Server Action call from a transition triggers Next to refetch this
// route and pass the updated prop down.
export default function ExperienceEditor({ initial }: { initial: ExperienceEntry[] }) {
  const [addState, addAction, addPending] = useActionState<ExperienceState, FormData>(addExperience, {});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  function onDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteExperience(id);
      setDeletingId(null);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Experience</h2>

      {initial.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {initial.map((exp) => (
            <li key={exp.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">{KIND_OPTIONS.find(([k]) => k === exp.kind)?.[1] ?? exp.kind}</p>
                <p className="text-sm text-[var(--ink)]">
                  {exp.org} — {exp.role}
                  {exp.term && <span className="text-[var(--ink-muted)]"> · {exp.term}</span>}
                </p>
                {exp.note && <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{exp.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDelete(exp.id)}
                disabled={deletingId === exp.id}
                className="shrink-0 text-sm text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                {deletingId === exp.id ? "…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {deleteError && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {deleteError}
        </p>
      )}

      {initial.length < 10 && (
        <form action={addAction} className="mt-4 border-t border-[var(--border)] pt-4">
          {addState.error && (
            <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
              {addState.error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Type</label>
              <Select
                options={KIND_SELECT_OPTIONS}
                name="kind"
                defaultValue=""
                ariaLabel="Type"
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <label className={label} htmlFor="exp-term">Term (optional)</label>
              <input id="exp-term" name="term" maxLength={40} placeholder="Summer 2026" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="exp-org">Organization</label>
              <input id="exp-org" name="org" required maxLength={80} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="exp-role">Role</label>
              <input id="exp-role" name="role" required maxLength={80} className={field} />
            </div>
          </div>
          <div className="mt-3">
            <label className={label} htmlFor="exp-note">Note (optional)</label>
            <textarea id="exp-note" name="note" maxLength={280} rows={2} className={field} />
          </div>
          <button type="submit" disabled={addPending} className="btn-ghost mt-3 !rounded-full !px-4 !py-1.5 text-sm">
            {addPending ? "Adding…" : "Add experience"}
          </button>
        </form>
      )}
    </section>
  );
}
