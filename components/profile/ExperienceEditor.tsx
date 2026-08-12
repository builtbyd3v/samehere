"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addExperience, deleteExperience, updateExperience, type ExperienceState } from "@/app/(app)/profile/edit/actions";
import Select from "@/components/ui/Select";
import DateRangePicker from "@/components/profile/DateRangePicker";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { formatDateRange, descriptionBullets } from "@/lib/experience-format";
import {
  EXPERIENCE_KIND_LABELS,
  HELP_EXPERIENCE_KINDS,
  groupExperiences,
} from "@/lib/profile-dossier";

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

const KIND_SELECT_OPTIONS = [
  { value: "", label: "Select type" },
  ...Object.entries(EXPERIENCE_KIND_LABELS).map(([value, label]) => ({ value, label })),
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

function ExperienceForm({ entry, action, pending, error, currentYear, submitLabel, pendingLabel, onCancel }: ExperienceFormProps) {
  const [kind, setKind] = useState(entry?.kind ?? "");
  const showHelp = HELP_EXPERIENCE_KINDS.has(kind);
  const orgLabel = kind === "project" ? "Domain" : "Organization";
  const roleLabel = kind === "project" ? "Project" : "Role";

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
            value={kind}
            onChange={setKind}
            ariaLabel="Type"
            className="mt-1.5 w-full"
          />
        </div>
        <div>
          <label className={label} htmlFor="exp-org">{orgLabel}</label>
          <input id="exp-org" name="org" required maxLength={80} defaultValue={entry?.org} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="exp-role">{roleLabel}</label>
          <input id="exp-role" name="role" required maxLength={80} defaultValue={entry?.role} className={field} />
        </div>
        <div className="sm:col-span-2">
          <DateRangePicker currentYear={currentYear} defaultStart={entry?.start_date} defaultEnd={entry?.end_date} defaultIsCurrent={entry?.is_current} />
        </div>
      </div>
      <div className="mt-3">
        <label className={label} htmlFor="exp-note">Description (optional)</label>
        <textarea
          id="exp-note"
          name="note"
          maxLength={600}
          rows={4}
          placeholder="One line per bullet. Generated project lines can be edited here."
          defaultValue={entry?.note ?? ""}
          className={field}
        />
      </div>
      {showHelp && (
        <label className="mt-3 flex items-start gap-2.5 text-sm text-[var(--ink)]">
          <input type="checkbox" name="open_to_help" className="mt-0.5 h-4 w-4 accent-[var(--ink)]" />
          <span>
            Open to help people applying here
            <span className="mt-0.5 block text-[var(--ink-muted)]">
              Turns on helper matching for internship, job, and research roles. Change anytime in Settings.
            </span>
          </span>
        </label>
      )}
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

function ExperienceRow({ exp, currentYear, isEditing, onStartEdit, onStopEdit, deletingId, onDelete }: ExperienceRowProps) {
  const [updateState, updateAction, updatePending] = useActionState<ExperienceState, FormData>(
    updateExperience.bind(null, exp.id),
    {},
  );

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
  const bullets = descriptionBullets(exp.note);

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
      <div className="flex items-start gap-3">
        <CompanyLogo name={exp.org} logoUrl={exp.logo_url} size="md" />
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{exp.role}</p>
          <p className="text-sm text-[var(--ink-muted)]">{exp.org}</p>
          {dateRange && <p className="text-sm text-[var(--ink-muted)]">{dateRange}</p>}
          {bullets.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5 text-sm break-words text-[var(--ink-muted)]">
              {bullets.map((bullet, j) => (
                <li key={`${exp.id}-${j}`}>{bullet}</li>
              ))}
            </ul>
          )}
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

export default function ExperienceEditor({ initial }: { initial: ExperienceEntry[] }) {
  const [addState, addAction, addPending] = useActionState<ExperienceState, FormData>(addExperience, {});
  const currentYear = new Date().getFullYear();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startDelete] = useTransition();
  const groups = groupExperiences(initial);

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
      <h2 className="text-sm font-semibold text-[var(--ink)]">Experience and projects</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Projects are labeled separately from internships and jobs. Generated bullets stay editable.
      </p>

      {groups.map((group) => (
        <div key={group.kind} className="mt-4">
          <p className="text-xs font-medium text-[var(--ink-muted)]">{group.label}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {group.items.map((exp) => (
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
        </div>
      ))}

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
