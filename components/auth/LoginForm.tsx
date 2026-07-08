"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, type AuthState } from "@/app/(auth)/actions";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordField from "./PasswordField";
import { authInput, authInputError, authLabel } from "./auth-fields";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(logIn, {});
  const hasError = !!state.error;

  return (
    <AuthCard title="Log in">
      <form action={formAction}>
        {state.error && <AuthAlert message={state.error} />}

        <div className="mb-4">
          <label htmlFor="email" className={authLabel}>
            School email
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
        </div>

        <div className="mb-2">
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          <PasswordField
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            hasError={hasError}
          />
        </div>

        <p className="mb-5 text-xs text-[var(--ink-muted)]">
          <Link href="/forgot-password" className="text-[var(--ink)] underline">
            Forgot password?
          </Link>
        </p>

        <AuthSubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

export function LoginFooter() {
  return (
    <p>
      New here?{" "}
      <Link href="/signup" className="font-medium text-[var(--blue)] hover:underline">
        Create an account
      </Link>
    </p>
  );
}
