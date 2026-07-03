"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authInput, authLabel, authSubmit } from "@/components/auth/auth-fields";

// Adapted from UpdatePasswordForm: no recovery-session check needed here —
// the viewer already has a live session to reach /settings.
export default function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) return setError("Couldn't update your password. Try again.");
    setSuccess(true);
    form.reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p role="alert" className="mb-4 text-sm text-[#c0392b] dark:text-[#e88]">
          {error}
        </p>
      )}
      {success && <p className="mb-4 text-sm text-[var(--ink-muted)]">Password updated.</p>}

      <div className="mb-4">
        <label htmlFor="password" className={authLabel}>New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8}
          placeholder="At least 8 characters" className={authInput} />
      </div>

      <div className="mb-5">
        <label htmlFor="confirm" className={authLabel}>Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8}
          placeholder="Repeat your password" className={authInput} />
      </div>

      <button type="submit" disabled={pending} className={authSubmit}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
