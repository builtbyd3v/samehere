"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Security boundary is the edge fn's verified JWT, not this form. Typed
// username + a final ConfirmDialog step are UX friction only.
export default function DeleteAccountSection({ username }: { username: string }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const matches = typed === username;

  async function handleDelete() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: invokeError } = await supabase.functions.invoke("delete-account");

    if (invokeError || (data && (data as { error?: string }).error)) {
      setPending(false);
      setError("Couldn't delete your account. Try again.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <section className="rounded-xl border border-[var(--danger)]/30 bg-[var(--surface)] p-6">
      <h2 className="mb-2 text-lg font-semibold text-[var(--danger)]">Danger zone</h2>
      <p className="mb-4 text-sm text-[var(--ink-muted)]">
        Deleting your account is permanent and irreversible. All your posts, comments, follows, and data will be
        removed forever.
      </p>

      {error && (
        <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <label htmlFor="confirm-username" className="block text-sm font-medium text-[var(--ink)]">
        Type <span className="font-semibold">{username}</span> to confirm
      </label>
      <input
        id="confirm-username"
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="mt-1.5 mb-4 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/40"
      />

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={!matches || pending}
        className="btn-danger w-full"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete account"
        message="This permanently deletes your account and all your data. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </section>
  );
}
