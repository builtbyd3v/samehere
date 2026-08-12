"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPathTaskFeedback } from "@/app/(app)/home/actions";
import type { PathFeedbackOutcome } from "@/lib/path/task-feedback";

export default function PathTaskFeedback({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [showStuckForm, setShowStuckForm] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] =
    useState<PathFeedbackOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(outcome: PathFeedbackOutcome) {
    setError(null);
    setPendingOutcome(outcome);
    startTransition(async () => {
      try {
        const result = await submitPathTaskFeedback(
          taskId,
          outcome,
          outcome === "stuck" ? note : undefined,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Could not save your feedback. Try again.");
      } finally {
        setPendingOutcome(null);
      }
    });
  }

  function cancelStuck() {
    setShowStuckForm(false);
    setNote("");
    setError(null);
  }

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <p className="text-xs font-medium text-[var(--ink-muted)]">Did this move fit?</p>

      {showStuckForm ? (
        <div className="mt-2 space-y-2">
          <label
            htmlFor={`path-task-feedback-${taskId}`}
            className="block text-sm text-[var(--ink)]"
          >
            What is getting in the way?{" "}
            <span className="text-[var(--ink-muted)]">(optional)</span>
          </label>
          <textarea
            id={`path-task-feedback-${taskId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={400}
            disabled={pending}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--border-strong)] disabled:opacity-60"
            placeholder="Share any blocker that should change your recommendation"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("stuck")}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--canvas)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingOutcome === "stuck" ? "Changing..." : "Change my next move"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelStuck}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("helped")}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingOutcome === "helped" ? "Saving..." : "Helped"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("not_relevant")}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingOutcome === "not_relevant" ? "Saving..." : "Not relevant"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setShowStuckForm(true);
            }}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            I&apos;m stuck
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
