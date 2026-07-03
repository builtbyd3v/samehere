"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "./AuthCard";
import { authHint, authInput, authLabel, authSubmit } from "./auth-fields";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
    });

    // Same response whether or not the email exists — no user enumeration.
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
          If an account exists for that email, we sent a link to reset your password.
        </p>
        <p className={`${authHint} mt-4`}>
          <Link href="/login" className="text-[var(--ink)] underline">
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password">
      <form onSubmit={handleSubmit}>
        <div className="mb-5">
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

        <button type="submit" disabled={pending} className={authSubmit}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordFooter() {
  return (
    <p>
      Remembered it?{" "}
      <Link href="/login" className="text-[var(--ink)] underline">
        Log in
      </Link>
    </p>
  );
}
