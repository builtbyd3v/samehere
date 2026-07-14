"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addExperience, deleteExperience, updateExperience, type ExperienceState } from "@/app/(app)/profile/edit/actions";
import Select from "@/components/ui/Select";
import DateRangePicker from "@/components/profile/DateRangePicker";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { formatDateRange } from "@/lib/experience-format";

export type ExperienceEntry = {
  id: string;
  kind: string;
  org: string;
  role: string;
  term: string | null;
  note: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  logo_url: string | null;
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

type ExperienceFormProps = {
  entry?: ExperienceEntry;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  currentYear: number;
  submitLabel: string;
  pendingLabel: string;
  onCancel?: () => void;
};

// Shared markup for both add and edit. entry is undefined for add, so every
// field falls back to an empty defaultValue and DateRangePicker gets no
// defaultStart/defaultEnd (both already optional there).
function ExperienceForm({ entry, action, pending, error, currentYear, submitLabel, pendingLabel, onCancel }: ExperienceFormProps) {
  return (
    <form action={action} className="mt-3 border-t border-[var(--border)] pt-3">
      {error && (
        <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Type</label>
          <Select
            options={KIND_SELECT_OPTIONS}
            name="kind"
            defaultValue={entry?.kind ?? ""}
            ariaLabel="Type"
            className="mt-1.5 w-full"
          />
        </div>
        <div>
          <label className={label} htmlFor="exp-org">Organization</label>
          <input id="exp-org" name="org" required maxLength={80} defaultValue={entry?.org} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="exp-role">Role</label>
          <input id="exp-role" name="role" required maxLength={80} defaultValue={entry?.role} className={field} />
        </div>
        <div className="sm:col-span-2">
          <DateRangePicker currentYear={currentYear} defaultStart={entry?.start_date} defaultEnd={entry?.end_date} defaultIsCurrent={entry?.is_current} />
        </div>
      </div>
      <div className="mt-3">
        <label className={label} htmlFor="exp-note">Description (optional)</label>
        <textarea id="exp-note" name="note" maxLength={600} rows={3} placeholder="One line per bullet" defaultValue={entry?.note ?? ""} className={field} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ghost !rounded-full !px-4 !py-1.5 text-sm">
          {pending ? pendingLabel : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

type ExperienceRowProps = {
  exp: ExperienceEntry;
  currentYear: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  deletingId: string | null;
  onDelete: (id: string) => void;
};

// One row's display/edit toggle lives in its own component so its
// useActionState (bound to this entry's id) has a stable identity across
// renders instead of being recreated from the list's map callback.
function ExperienceRow({ exp, currentYear, isEditing, onStartEdit, onStopEdit, deletingId, onDelete }: ExperienceRowProps) {
  const [updateState, updateAction, updatePending] = useActionState<ExperienceState, FormData>(
    updateExperience.bind(null, exp.id),
    {},
  );

  // useActionState has no "on success" callback, so an effect watching the
  // pending-to-not-pending transition is the way to react to a completed
  // submission, closing the edit form once the update lands with no error.
  const wasPending = useRef(updatePending);
  useEffect(() => {
    if (wasPending.current && !updatePending && !updateState.error) {
      onStopEdit();
    }
    wasPending.current = updatePending;
  }, [updatePending, updateState, onStopEdit]);

  if (isEditing) {
    return (
      <li className="rounded-lg border border-[var(--border)] px-3 py-2.5">
        <ExperienceForm
          entry={exp}
          action={updateAction}
          pending={updatePending}
          error={updateState.error}
          currentYear={currentYear}
          submitLabel="Save"
          pendingLabel="Saving…"
          onCancel={onStopEdit}
        />
      </li>
    );
  }

  const dateRange = formatDateRange(exp.start_date, exp.end_date, exp.term);

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
      <div className="flex items-start gap-3">
        <CompanyLogo name={exp.org} logoUrl={exp.logo_url} size="md" />
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{exp.role}</p>
          <p className="text-sm text-[var(--ink-muted)]">{exp.org}</p>
          {dateRange && <p className="text-sm text-[var(--ink-muted)]">{dateRange}</p>}
          {exp.note && <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{exp.note}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onStartEdit}
          className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(exp.id)}
          disabled={deletingId === exp.id}
          className="text-sm text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-50"
        >
          {deletingId === exp.id ? "…" : "Delete"}
        </button>
      </div>
    </li>
  );
}

// Separate concern from EditProfileForm, its own card, its own server
// actions. Existing entries render inline edit-in-place via ExperienceRow;
// add stays a standalone form below the list, both sharing ExperienceForm's
// markup. Both actions revalidatePath the edit page, so the list here is
// rendered straight off the `initial` prop rather than duplicated into local
// state, since a Server Action call from a transition triggers Next to refetch
// this route and pass the updated prop down.
export default function ExperienceEditor({ initial }: { initial: ExperienceEntry[] }) {
  const [addState, addAction, addPending] = useActionState<ExperienceState, FormData>(addExperience, {});
  const currentYear = new Date().getFullYear();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startDelete] = useTransition();

  // Same pending-to-not-pending pattern as ExperienceRow's edit-close effect:
  // useActionState has no success callback, so collapse the add form once a
  // submission completes with no error.
  const wasAddPending = useRef(addPending);
  useEffect(() => {
    if (wasAddPending.current && !addPending && !addState.error) {
      setAdding(false);
    }
    wasAddPending.current = addPending;
  }, [addPending, addState]);

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
        <ul className="mt-3 flex flex-col gap-2">
          {initial.map((exp) => (
            <ExperienceRow
              key={exp.id}
              exp={exp}
              currentYear={currentYear}
              isEditing={editingId === exp.id}
              onStartEdit={() => setEditingId(exp.id)}
              onStopEdit={() => setEditingId(null)}
              deletingId={deletingId}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {deleteError && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {deleteError}
        </p>
      )}

      {initial.length < 10 && (
        adding ? (
          <ExperienceForm
            action={addAction}
            pending={addPending}
            error={addState.error}
            currentYear={currentYear}
            submitLabel="Add experience"
            pendingLabel="Adding…"
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-ghost !mt-3 !w-full !rounded-full !py-1.5 text-sm"
          >
            + Add experience
          </button>
        )
      )}
    </section>
  );
}
