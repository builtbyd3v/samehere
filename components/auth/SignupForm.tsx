"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import SignupSuccess from "./SignupSuccess";
import PasswordField from "./PasswordField";
import OAuthButtons, { OAuthDivider } from "./OAuthButtons";
import { authHint, authInput, authInputError, authLabel } from "./auth-fields";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});
  const hasError = !!state.error;
  const refFromLink = useSearchParams().get("ref") ?? "";

  // Fire once when the form transitions to success. Ref guard so a re-render of
  // the success branch can't re-capture. Declared above the early-return so the
  // hook order stays stable (Rules of Hooks).
  const capturedRef = useRef(false);
  useEffect(() => {
    if (state.ok && !capturedRef.current) {
      capturedRef.current = true;
      posthog.capture("signup_submitted", { has_ref: !!refFromLink });
    }
  }, [state.ok, refFromLink]);

  if (state.ok && state.email) {
    return <SignupSuccess email={state.email} />;
  }

  return (
    <AuthCard title="Create your account">
      <form action={formAction}>
        {state.error && <AuthAlert message={state.error} />}

        <OAuthButtons />
        <OAuthDivider />

        <div className="mb-3">
          <label htmlFor="email" className={authLabel}>
            Email
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
          <p className={authHint}>Use your school (.edu) email and you&apos;re verified as a student instantly. Any email works.</p>
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
