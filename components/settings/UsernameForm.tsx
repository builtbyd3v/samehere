"use client";

import { useActionState } from "react";
import { updateUsername, type UsernameState } from "@/app/(app)/settings/actions";

export default function UsernameForm({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState<UsernameState, FormData>(updateUsername, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-[var(--ink-muted)]">Username updated.</p>}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-[var(--ink)]">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={20}
          defaultValue={username}
          placeholder="yourname"
          className="input-base mt-1.5"
        />
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          3-20 characters: lowercase letters, numbers, or underscores. Changing your username changes your profile link.
        </p>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}
