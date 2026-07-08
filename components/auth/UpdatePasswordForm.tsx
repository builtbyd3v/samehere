"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordField from "./PasswordField";
import { authLabel } from "./auth-fields";

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
        <AuthAlert
          variant="info"
          message="This reset link is no longer valid. Request a new one to continue."
        />
        <p className="mt-4 text-xs text-[var(--ink-muted)]">
          <Link href="/forgot-password" className="text-[var(--ink)] underline">
            Request a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  // hasSession === null: still verifying the recovery link. Show the card's
  // shape as a skeleton instead of an interactive form that might flash away.
  if (hasSession === null) {
    return (
      <AuthCard title="Set a new password">
        <div className="mb-4">
          <div className="skeleton h-3.5 w-28" />
          <div className="skeleton mt-1.5 h-[42px] w-full" />
        </div>
        <div className="mb-5">
          <div className="skeleton h-3.5 w-36" />
          <div className="skeleton mt-1.5 h-[42px] w-full" />
        </div>
        <div className="skeleton h-[42px] w-full" />
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
          <PasswordField
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            hasError={!!error}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="confirm" className={authLabel}>
            Confirm password
          </label>
          <PasswordField
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            placeholder="Repeat your password"
            hasError={!!error}
          />
        </div>

        <AuthSubmitButton pending={pending} pendingLabel="Updating…">
          Update password
        </AuthSubmitButton>
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
