"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestRediagnosis,
  type RediagnosisActionState,
} from "@/app/(app)/path/actions";

export default function RediagnoseForm({
  showBlocker = false,
  compact = false,
}: {
  showBlocker?: boolean;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<RediagnosisActionState, FormData>(
    requestRediagnosis,
    {},
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-muted)]">
        <Link href="/path/redo" className="underline hover:text-[var(--ink)]">
          Something changed
        </Link>
        <span aria-hidden>·</span>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="underline hover:text-[var(--ink)] disabled:opacity-60"
          >
            {pending ? "Refreshing…" : "Re-run path"}
          </button>
        </form>
        {state.overCap && (
          <p className="w-full text-sm text-[var(--ink)]">
            Daily AI refresh used up.{" "}
            <Link href="/pro" className="underline">
              Pro
            </Link>{" "}
            unlocks more, or try again tomorrow.
          </p>
        )}
        {state.error && (
          <p role="alert" className="w-full text-sm text-[var(--ink)]">
            {state.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink)]"
        >
          {state.error}
        </p>
      )}
      {state.overCap && (
        <p className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)]">
          You&apos;ve used today&apos;s free AI diagnosis.{" "}
          <Link href="/pro" className="underline">
            Upgrade to Pro
          </Link>{" "}
          for more, or try again tomorrow.
        </p>
      )}

      {showBlocker && (
        <label className="block text-sm text-[var(--ink)]">
          What&apos;s blocking you now?
          <textarea
            name="blocker"
            rows={3}
            maxLength={400}
            placeholder="e.g. Got an OA next week and feel unprepared"
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
          />
        </label>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Refreshing path…" : "Re-run path"}
      </button>
    </form>
  );
}
