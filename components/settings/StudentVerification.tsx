"use client";

import { useActionState } from "react";
import {
  requestSchoolVerification,
  confirmSchoolVerification,
  type VerificationState,
} from "@/app/(app)/settings/actions";
import { IconGraduationCap } from "@/components/icons";

export default function StudentVerification({ verified }: { verified: boolean }) {
  const [requestState, requestAction, requestPending] = useActionState<VerificationState, FormData>(
    requestSchoolVerification,
    {},
  );
  const [confirmState, confirmAction, confirmPending] = useActionState<VerificationState, FormData>(
    confirmSchoolVerification,
    {},
  );

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <IconGraduationCap className="h-4 w-4 text-[var(--ink-muted)]" />
        <span>Verified student since signup or via school email.</span>
      </div>
    );
  }

  if (requestState.success) {
    return (
      <form action={confirmAction} className="space-y-3">
        <p className="text-sm text-[var(--ink-muted)]">We sent a 6-digit code to your school email. It expires in 15 minutes.</p>
        {confirmState.error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {confirmState.error}
          </p>
        )}
        <div>
          <label htmlFor="verify-code" className="block text-sm font-medium text-[var(--ink)]">
            Verification code
          </label>
          <input
            id="verify-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="6-digit code"
            className="input-base mt-1.5"
          />
        </div>
        <button type="submit" disabled={confirmPending} className="btn-primary w-full">
          {confirmPending ? "Verifying…" : "Verify"}
        </button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-3">
      <p className="text-sm text-[var(--ink-muted)]">Verify a .edu email to earn the Verified Student badge.</p>
      {requestState.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {requestState.error}
        </p>
      )}
      <div>
        <label htmlFor="verify-email" className="block text-sm font-medium text-[var(--ink)]">
          School email
        </label>
        <input
          id="verify-email"
          name="email"
          type="email"
          required
          placeholder="you@school.edu"
          className="input-base mt-1.5"
        />
      </div>
      <button type="submit" disabled={requestPending} className="btn-primary w-full">
        {requestPending ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}
