"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, type AuthState } from "../actions";

const label = "block text-sm font-medium text-[var(--ink)]";
const input =
  "mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(logIn, {});

  return (
    <main className="grid min-h-[100dvh] place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-[-0.02em]">
            samehere
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Welcome back</h1>
          <p className="mt-1.5 text-[15px] text-[var(--ink-muted)]">Log in to your account.</p>
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

          <div className="mb-5">
            <label htmlFor="password" className={label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your password"
              className={input}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-inset w-full rounded-md bg-[var(--ink)] px-4 py-2.5 text-[15px] font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[var(--ink)] underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
