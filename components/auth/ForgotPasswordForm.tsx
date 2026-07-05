"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import { authHint, authInput, authLabel } from "./auth-fields";

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
        <AuthAlert
          variant="success"
          message="If an account exists for that email, we sent a link to reset your password."
        />
        <p className={authHint}>
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

        <AuthSubmitButton pending={pending} pendingLabel="Sending…">
          Send reset link
        </AuthSubmitButton>
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
