"use client";

import { useActionState } from "react";
import { updateOpenToHelp, type OpenToHelpState } from "@/app/(app)/settings/actions";

export default function OpenToHelpForm({ initial }: { initial: boolean }) {
  const [state, formAction, pending] = useActionState<OpenToHelpState, FormData>(updateOpenToHelp, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p role="alert" className="rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink)]">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-[var(--ink-muted)]">Saved.</p>}

      <label className="flex items-start gap-2.5 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          name="open_to_help"
          defaultChecked={initial}
          className="mt-0.5 h-4 w-4 accent-[var(--ink)]"
        />
        <span>
          Open to help people applying where I&apos;ve worked
          <span className="mt-0.5 block text-[var(--ink-muted)]">
            Only shows you on listings that match your internship, job, or research experience.
            You can turn this off anytime.
          </span>
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save helper preference"}
      </button>
    </form>
  );
}
