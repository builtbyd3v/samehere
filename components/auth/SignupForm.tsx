"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import SignupSuccess from "./SignupSuccess";
import { authHint, authInput, authLabel, authSubmit } from "./auth-fields";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});

  if (state.ok && state.email) {
    return <SignupSuccess email={state.email} />;
  }

  return (
    <AuthCard title="Create your account">
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
            className={authInput}
          />
        </div>

        <div className="mb-4">
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
            className={authInput}
          />
          <p className={authHint}>3–20 characters: lowercase letters, numbers, or underscores.</p>
        </div>

        <div className="mb-5">
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={authInput}
          />
        </div>

        <button type="submit" disabled={pending} className={authSubmit}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export function SignupFooter() {
  return (
    <p>
      Already have an account?{" "}
      <Link href="/login" className="text-[var(--ink)] underline">
        Log in
      </Link>
    </p>
  );
}
