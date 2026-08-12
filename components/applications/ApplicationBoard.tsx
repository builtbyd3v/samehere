"use client";

import { useActionState, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  APPLICATION_STATUSES,
  createApplication,
  deleteApplication,
  updateApplicationStatus,
  type ApplicationActionState,
  type ApplicationRow,
  type ApplicationStatus,
} from "@/app/(app)/applications/actions";
import Select from "@/components/ui/Select";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  oa: "OA",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const PIPELINE: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

function nextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  const forward: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
    wishlist: ["applied", "withdrawn"],
    applied: ["oa", "interview", "rejected", "withdrawn"],
    oa: ["interview", "rejected", "withdrawn"],
    interview: ["offer", "rejected", "withdrawn"],
    offer: ["withdrawn"],
    rejected: ["wishlist", "applied"],
    withdrawn: ["wishlist"],
  };
  return forward[current] ?? [];
}

type BoardItem = ApplicationRow;

function ApplicationCard({
  app,
  onStatus,
  onDelete,
  pendingId,
}: {
  app: BoardItem;
  onStatus: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  pendingId: string | null;
}) {
  const moves = nextStatuses(app.status);
  const busy = pendingId === app.id;

  return (
    <li className="rounded-lg border border-[var(--border)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--ink)]">{app.role}</p>
          <p className="truncate text-sm text-[var(--ink-muted)]">{app.org}</p>
          {app.listing_id && (
            <Link
              href={`/jobs/${app.listing_id}`}
              className="mt-1 inline-block text-xs text-[var(--blue)] underline"
            >
              View listing
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(app.id)}
          disabled={busy}
          className="shrink-0 text-xs text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select
          options={STATUS_OPTIONS}
          value={app.status}
          ariaLabel="Status"
          className="w-full max-w-[10rem]"
          disabled={busy}
          onChange={(v) => onStatus(app.id, v as ApplicationStatus)}
        />
        {moves.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => onStatus(app.id, s)}
            className="btn-ghost !rounded-full !px-2.5 !py-1 text-xs disabled:opacity-50"
          >
            → {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </li>
  );
}

export default function ApplicationBoard({ initial }: { initial: ApplicationRow[] }) {
  const [items, setItems] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  const [createState, createAction, createPending] = useActionState<ApplicationActionState, FormData>(
    async (prev, formData) => {
      const res = await createApplication(prev, formData);
      if (res.success) {
        const org = String(formData.get("org") ?? "").trim();
        const role = String(formData.get("role") ?? "").trim();
        const statusRaw = String(formData.get("status") ?? "wishlist").trim();
        const status = (APPLICATION_STATUSES as readonly string[]).includes(statusRaw)
          ? (statusRaw as ApplicationStatus)
          : "wishlist";
        const now = new Date().toISOString();
        if (res.id) {
          setItems((prevItems) => [
            {
              id: res.id!,
              user_id: "",
              listing_id: null,
              org,
              role,
              status,
              notes: null,
              created_at: now,
              updated_at: now,
            },
            ...prevItems,
          ]);
        }
        formRef.current?.reset();
        setAdding(false);
      }
      return res;
    },
    {},
  );

  function onStatus(id: string, status: ApplicationStatus) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      setOptimistic((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a)),
      );
      const res = await updateApplicationStatus(id, status);
      setPendingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a)),
      );
    });
  }

  function onDelete(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      setOptimistic((prev) => prev.filter((a) => a.id !== id));
      const res = await deleteApplication(id);
      setPendingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
    });
  }

  const byStatus = PIPELINE.map((status) => ({
    status,
    apps: optimistic.filter((a) => a.status === status),
  }));

  return (
    <div className="space-y-5">
      {(error || createState.error) && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error ?? createState.error}
        </p>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper">
        {adding ? (
          <form ref={formRef} action={createAction} className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Add application</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="app-org">
                  Organization
                </label>
                <input id="app-org" name="org" required maxLength={120} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="app-role">
                  Role
                </label>
                <input id="app-role" name="role" required maxLength={120} className={field} />
              </div>
              <div>
                <label className={label}>Status</label>
                <Select
                  options={STATUS_OPTIONS}
                  name="status"
                  defaultValue="wishlist"
                  ariaLabel="Status"
                  className="mt-1.5 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={createPending} className="btn-primary">
                {createPending ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-ghost !w-full !rounded-full !py-2 text-sm"
          >
            + Add org / role
          </button>
        )}
      </div>

      {optimistic.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-6 py-14 text-center shadow-paper">
          <p className="font-medium text-[var(--ink)]">No applications yet</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            Track a listing from Opportunities, or add one manually above.
          </p>
          <Link href="/jobs" className="btn-ghost mt-5 inline-flex">
            Browse opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {byStatus.map(({ status, apps }) =>
            apps.length === 0 ? null : (
              <section
                key={status}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper"
              >
                <h2 className="flex items-baseline gap-2 text-sm font-semibold text-[var(--ink)]">
                  {STATUS_LABELS[status]}
                  <span className="text-xs font-normal text-[var(--ink-faint)]">{apps.length}</span>
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {apps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onStatus={onStatus}
                      onDelete={onDelete}
                      pendingId={pendingId}
                    />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
