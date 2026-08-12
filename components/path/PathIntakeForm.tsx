"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  submitPathIntake,
  type PathIntakeState,
} from "@/app/(app)/onboarding/actions";
import LoadingState from "@/components/landing/LoadingState";
import {
  CONSTRAINT_OPTIONS,
  STAGE_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/lib/path/intake-options";
import type { IntakeAnswers } from "@/lib/path/diagnose";

const label = "block text-sm font-medium text-[var(--ink)]";
const field = "input-base mt-1.5";

export default function PathIntakeForm({
  defaults,
  footer,
  heading = "Where are you stuck?",
  description = "Honest answers get you a path that fits. Not a generic dashboard.",
  submitLabel = "Diagnose my path",
  pendingLabel = "Diagnosing…",
  onDiagnosingChange,
}: {
  defaults?: IntakeAnswers | null;
  footer?: ReactNode;
  heading?: string;
  description?: string;
  submitLabel?: string;
  pendingLabel?: string;
  onDiagnosingChange?: (diagnosing: boolean) => void;
}) {
  const [intakeState, setIntakeState] = useState<PathIntakeState>({});
  const [diagnosing, setDiagnosing] = useState(false);
  const [intakePending, startIntake] = useTransition();

  function setBusy(next: boolean) {
    setDiagnosing(next);
    onDiagnosingChange?.(next);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIntakeState({});
    setBusy(true);
    startIntake(async () => {
      const result = await submitPathIntake({}, fd);
      if (result?.overCap || result?.error) {
        setIntakeState(result);
        setBusy(false);
      }
    });
  }

  const busy = intakePending || diagnosing;

  return (
    <>
      <form
        onSubmit={onSubmit}
        className={diagnosing ? "hidden" : undefined}
        aria-hidden={diagnosing}
      >
      {heading ? (
        <h2 className="mb-1 text-xl font-medium tracking-[-0.025em] text-[var(--ink)]">
          {heading}
        </h2>
      ) : null}
      {description ? (
        <p className="mb-4 text-sm text-[var(--ink-muted)]">{description}</p>
      ) : null}

      {intakeState.error && (
        <p role="alert" className="mb-3 text-sm text-[var(--danger)]">
          {intakeState.error}
        </p>
      )}
      {intakeState.overCap && (
        <div className="mb-4 rounded-[var(--landing-radius-sm)] border border-[var(--border)] bg-[var(--featured-surface)] px-4 py-3 text-sm">
          <p className="text-[var(--ink)]">You&apos;ve used today&apos;s free diagnosis.</p>
          <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
            Go Pro for more diagnoses
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <fieldset>
          <legend className={label}>Stage</legend>
          <div className="mt-2 flex flex-col gap-2">
            {STAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
              >
                <input
                  type="radio"
                  name="stage"
                  value={opt.value}
                  required
                  defaultChecked={defaults?.stage === opt.value}
                  className="accent-[var(--accent-blue)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>What shapes your search? (optional)</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CONSTRAINT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
              >
                <input
                  type="checkbox"
                  name="constraints"
                  value={opt.value}
                  defaultChecked={Boolean(defaults?.constraints?.includes(opt.value))}
                  className="accent-[var(--accent-blue)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="target_roles" className={label}>
            Target roles
          </label>
          <input
            id="target_roles"
            name="target_roles"
            type="text"
            maxLength={240}
            placeholder="e.g. SWE intern, data analyst"
            defaultValue={defaults?.target_roles?.join(", ") ?? ""}
            className={field}
          />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">Comma-separated</p>
        </div>

        <div>
          <label htmlFor="target_companies" className={label}>
            Target companies
          </label>
          <input
            id="target_companies"
            name="target_companies"
            type="text"
            maxLength={240}
            placeholder="e.g. Stripe, local startups"
            defaultValue={defaults?.target_companies?.join(", ") ?? ""}
            className={field}
          />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">Comma-separated</p>
        </div>

        <fieldset>
          <legend className={label}>Timeline</legend>
          <div className="mt-2 flex flex-col gap-2">
            {TIMELINE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]"
              >
                <input
                  type="radio"
                  name="timeline"
                  value={opt.value}
                  required
                  defaultChecked={defaults?.timeline === opt.value}
                  className="accent-[var(--accent-blue)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="blocker" className={label}>
            Main blocker right now
          </label>
          <textarea
            id="blocker"
            name="blocker"
            required
            rows={3}
            maxLength={400}
            placeholder="e.g. No projects to show, freezing on applications, no referrals"
            defaultValue={defaults?.blocker ?? ""}
            className={`${field} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="resume_or_projects" className={label}>
            Resume or projects (optional)
          </label>
          <textarea
            id="resume_or_projects"
            name="resume_or_projects"
            rows={3}
            maxLength={2000}
            placeholder="Paste a short resume blurb or list what you've built"
            defaultValue={defaults?.resume_or_projects ?? ""}
            className={`${field} resize-y`}
          />
        </div>
      </div>

      <div className={`mt-6 flex items-center ${footer ? "justify-between" : "justify-end"}`}>
        {footer}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
      {diagnosing ? (
        <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
          <LoadingState label="Building your path" variant="Orbit" />
          <p className="mx-auto mt-5 max-w-sm text-sm text-[var(--ink-muted)]">
            Reading where you are, naming the blocker, and choosing a home that fits.
          </p>
        </div>
      ) : null}
    </>
  );
}
