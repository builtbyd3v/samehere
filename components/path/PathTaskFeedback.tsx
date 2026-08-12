"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const reduced = useReducedMotion();

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
        setShowStuckForm(false);
        setNote("");
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
    <div className="path-feedback">
      <div className="path-feedback-heading">
        <p>Did this move fit?</p>
        <span>Your answer reshapes the next one.</span>
      </div>

      <AnimatePresence initial={false} mode="wait">
      {showStuckForm ? (
        <motion.div
          key="stuck-form"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          className="mt-3 space-y-2"
        >
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
            <motion.button
              type="button"
              disabled={pending}
              onClick={() => submit("stuck")}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="path-feedback-submit"
            >
              {pendingOutcome === "stuck" ? "Changing..." : "Change my next move"}
            </motion.button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelStuck}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="choices"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          className="mt-3 flex flex-wrap gap-2"
        >
          <motion.button
            type="button"
            disabled={pending}
            onClick={() => submit("helped")}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="path-feedback-choice"
          >
            {pendingOutcome === "helped" ? "Saving..." : "Helped"}
          </motion.button>
          <motion.button
            type="button"
            disabled={pending}
            onClick={() => submit("not_relevant")}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="path-feedback-choice"
          >
            {pendingOutcome === "not_relevant" ? "Saving..." : "Not relevant"}
          </motion.button>
          <motion.button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setShowStuckForm(true);
            }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="path-feedback-choice"
          >
            I&apos;m stuck
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
