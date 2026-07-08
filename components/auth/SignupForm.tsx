"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import SignupSuccess from "./SignupSuccess";
import PasswordField from "./PasswordField";
import { authHint, authInput, authInputError, authLabel } from "./auth-fields";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});
  const hasError = !!state.error;
  const refFromLink = useSearchParams().get("ref") ?? "";

  if (state.ok && state.email) {
    return <SignupSuccess email={state.email} />;
  }

  return (
    <AuthCard title="Create your account">
      <form action={formAction}>
        {state.error && <AuthAlert message={state.error} />}

        <div className="mb-3">
          <label htmlFor="email" className={authLabel}>
            School email (.edu required)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@school.edu"
            aria-invalid={hasError}
            className={hasError ? authInputError : authInput}
          />
          <p className={authHint}>Only used to verify you&apos;re a student.</p>
        </div>

        <div className="mb-3">
          <label htmlFor="username" className={authLabel}>
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="yourname"
            aria-invalid={hasError}
            className={hasError ? authInputError : authInput}
          />
          <p className={`${authHint} hidden sm:block`}>3-20 characters: lowercase letters, numbers, or underscores.</p>
        </div>

        <div className="mb-4">
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          <PasswordField
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            hasError={hasError}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="ref_code" className={authLabel}>
            Referral code <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
          </label>
          <input
            id="ref_code"
            name="ref_code"
            type="text"
            autoComplete="off"
            defaultValue={refFromLink}
            placeholder="friendcode"
            className={authInput}
          />
          <p className={`${authHint} hidden sm:block`}>Have a referral code? Enter it here.</p>
        </div>

        <AuthSubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

export function SignupFooter() {
  return (
    <p>
      Already have an account?{" "}
      <Link href="/login" className="font-medium text-[var(--blue)] hover:underline">
        Log in
      </Link>
    </p>
  );
}
