"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import { authInput, authLabel, authSubmit } from "./auth-fields";

export default function UpdatePasswordForm() {
  const router = useRouter();
  // Recovery session comes from /auth/confirm exchanging the reset-link code.
  // null = still checking, false = no session (link expired/missing).
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) return setError("Couldn't update your password. Try the reset link again.");
    router.push("/feed");
  }

  if (hasSession === false) {
    return (
      <AuthCard title="Link expired">
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
          This reset link is no longer valid. Request a new one to continue.
        </p>
        <p className="mt-4 text-xs text-[var(--ink-muted)]">
          <Link href="/forgot-password" className="text-[var(--ink)] underline">
            Request a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit}>
        {error && <AuthAlert message={error} />}

        <div className="mb-4">
          <label htmlFor="password" className={authLabel}>
            New password
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

        <div className="mb-5">
          <label htmlFor="confirm" className={authLabel}>
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repeat your password"
            className={authInput}
          />
        </div>

        <button type="submit" disabled={pending || hasSession === null} className={authSubmit}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}

export function UpdatePasswordFooter() {
  return (
    <p>
      <Link href="/login" className="text-[var(--ink)] underline">
        Back to log in
      </Link>
    </p>
  );
}
