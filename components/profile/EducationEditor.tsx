"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addEducation, deleteEducation, updateEducation, type EducationState } from "@/app/(app)/profile/edit/actions";
import DateRangePicker from "@/components/profile/DateRangePicker";
import SchoolAutocomplete from "@/components/profile/SchoolAutocomplete";
import Select from "@/components/ui/Select";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { schoolLogoUrl } from "@/lib/school-logo";
import { DEGREE_OPTIONS } from "@/lib/education-options";
import { formatDateRange } from "@/lib/experience-format";

export type EducationEntry = {
  id: string;
  school: string;
  school_domain: string | null;
  degree: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

type EducationFormAction = (prevState: EducationState, formData: FormData) => Promise<EducationState>;

// Shared by the "add" form and each row's inline "edit" form — `entry` unset
// means add mode. Each instance owns its own useActionState so add and edit
// forms never share pending/error state.
function EducationForm({
  entry,
  currentYear,
  action,
  submitLabel,
  pendingLabel,
  onSuccess,
  onCancel,
}: {
  entry?: EducationEntry;
  currentYear: number;
  action: EducationFormAction;
  submitLabel: string;
  pendingLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<EducationState, FormData>(action, {});
  const idSuffix = entry?.id ?? "new";
  // useActionState has no synchronous "it succeeded" signal, so watch for a
  // pending true -> false transition with no error to detect success.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) onSuccess?.();
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      {state.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`edu-school-${idSuffix}`}>School</label>
          <SchoolAutocomplete
            id={`edu-school-${idSuffix}`}
            name="school"
            domainName="school_domain"
            defaultValue={entry?.school}
            defaultDomain={entry?.school_domain ?? undefined}
            maxLength={80}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Degree</label>
          <Select options={[...DEGREE_OPTIONS]} name="degree" defaultValue={entry?.degree ?? ""} ariaLabel="Degree" className="mt-1.5 w-full" />
        </div>
        <div>
          <label className={label} htmlFor={`edu-field-${idSuffix}`}>Field of study (optional)</label>
          <input
            id={`edu-field-${idSuffix}`}
            name="field"
            maxLength={80}
            placeholder="Computer Science"
            defaultValue={entry?.field ?? ""}
            className={field}
          />
        </div>
      </div>
      <DateRangePicker
        currentYear={currentYear}
        defaultStart={entry?.start_date}
        defaultEnd={entry?.end_date}
        defaultIsCurrent={entry?.is_current}
      />
      <div className="flex items-center gap-3">
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

// Mirrors ExperienceEditor: own card, own server actions. Unlike Experience,
// education supports edit-in-place — editingId swaps one row's display for
// an inline EducationForm bound to updateEducation. List renders straight
// off `initial` since all actions revalidatePath the edit page.
export default function EducationEditor({ initial }: { initial: EducationEntry[] }) {
  const currentYear = new Date().getFullYear();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startDelete] = useTransition();

  function onDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteEducation(id);
      setDeletingId(null);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Education</h2>

      {initial.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {initial.map((edu) => {
            if (editingId === edu.id) {
              return (
                <li key={edu.id} className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                  <EducationForm
                    entry={edu}
                    currentYear={currentYear}
                    action={updateEducation.bind(null, edu.id)}
                    submitLabel="Save"
                    pendingLabel="Saving…"
                    onSuccess={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              );
            }

            const detail = [edu.degree, edu.field].filter(Boolean).join(" · ");
            const dateRange = formatDateRange(edu.start_date, edu.end_date, null);
            return (
              <li key={edu.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <CompanyLogo name={edu.school} logoUrl={schoolLogoUrl(edu.school_domain)} size="md" />
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{edu.school}</p>
                    {detail && <p className="text-sm text-[var(--ink-muted)]">{detail}</p>}
                    {dateRange && <p className="text-sm text-[var(--ink-muted)]">{dateRange}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(edu.id)}
                    className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(edu.id)}
                    disabled={deletingId === edu.id}
                    className="text-sm text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {deletingId === edu.id ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deleteError && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {deleteError}
        </p>
      )}

      {initial.length < 5 && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          {adding ? (
            <EducationForm
              currentYear={currentYear}
              action={addEducation}
              submitLabel="Add education"
              pendingLabel="Adding…"
              onSuccess={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="btn-ghost w-full !rounded-full !py-1.5 text-sm"
            >
              + Add education
            </button>
          )}
        </div>
      )}
    </section>
  );
}
