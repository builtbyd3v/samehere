"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { logIn, type AuthState } from "@/app/(auth)/actions";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordField from "./PasswordField";
import OAuthButtons, { OAuthDivider } from "./OAuthButtons";
import { authInput, authInputError, authLabel } from "./auth-fields";

// useSearchParams (for ?error=oauth) requires a Suspense boundary in a
// statically-prerendered page; app/(auth)/login/page.tsx doesn't provide one,
// so LoginForm wraps its own body rather than touching that file.
type LoginFormProps = {
  inviteOnly?: boolean;
};

export default function LoginForm({ inviteOnly = false }: LoginFormProps) {
  return (
    <Suspense fallback={<AuthCard title="Log in">{null}</AuthCard>}>
      <LoginFormInner inviteOnly={inviteOnly} />
    </Suspense>
  );
}

function LoginFormInner({ inviteOnly }: { inviteOnly: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(logIn, {});
  const oauthError = useSearchParams().get("error") === "oauth";
  const hasError = !!state.error || oauthError;

  return (
    <AuthCard title="Log in">
      <form action={formAction}>
        {state.error && <AuthAlert message={state.error} />}
        {!state.error && oauthError && <AuthAlert message="Sign-in failed, try again." />}

        {/* Hidden during invite-only beta: a first OAuth "login" auto-creates
            an account, bypassing the invite-code gate on signup. */}
        {!inviteOnly && (
          <>
            <OAuthButtons />
            <OAuthDivider />
          </>
        )}

        <div className="mb-4">
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
