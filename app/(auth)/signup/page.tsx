"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";

const label = "block text-sm font-medium text-[var(--ink)]";
const input =
  "mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";
const hint = "mt-1 text-xs text-[var(--ink-muted)]";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {});

  // Success — confirmation email sent. No form; the user goes to their inbox.
  if (state.ok) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-5 py-12">
        <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Check your email</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
            We sent a confirmation link to{" "}
            <span className="font-medium text-[var(--ink)]">{state.email}</span>. Click it to
            activate your account.
          </p>
          <p className={hint}>
            Wrong address or nothing arrived? <Link href="/signup" className="underline">Start over</Link>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-[-0.02em]">
            samehere
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Create your account</h1>
          <p className="mt-1.5 text-[15px] text-[var(--ink-muted)]">
            For verified students. A valid .edu email required.
          </p>
        </div>

        <form action={formAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {state.error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink)]"
            >
              {state.error}
            </p>
          )}

          <div className="mb-4">
            <label htmlFor="email" className={label}>School email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@school.edu"
              className={input}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="username" className={label}>Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="yourname"
              className={input}
            />
            <p className={hint}>3–20 characters: lowercase letters, numbers, or underscores.</p>
          </div>

          <div className="mb-5">
            <label htmlFor="password" className={label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className={input}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-inset w-full rounded-md bg-[var(--ink)] px-4 py-2.5 text-[15px] font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--ink)] underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
