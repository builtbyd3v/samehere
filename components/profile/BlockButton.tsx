"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Low-key secondary control — Block/Unblock live next to FollowButton, not
// competing with it visually. block_user (definer) also wipes any follow both
// ways; unblock is a plain RLS delete of our own blocks row (mirrors FollowButton's unfollow).
export default function BlockButton({ targetId, initialBlocked }: { targetId: string; initialBlocked: boolean }) {
  const [supabase] = useState(createClient);
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function block() {
    setBusy(true);
    const { error } = await supabase.rpc("block_user", { target: targetId });
    setBusy(false);
    if (!error) {
      setBlocked(true);
      router.refresh();
    }
  }

  async function unblock() {
    setBusy(true);
    const { error } = await supabase.from("blocks").delete().eq("blocked_id", targetId);
    setBusy(false);
    if (!error) {
      setBlocked(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (blocked ? unblock() : setConfirmOpen(true))}
        disabled={busy}
        className="shrink-0 text-sm text-[var(--ink-muted)] underline-offset-2 transition hover:underline active:opacity-80 disabled:opacity-50"
      >
        {blocked ? "Unblock" : "Block"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={block}
        title="Block user"
        message="Block this user? This removes any follow between you and hides their posts from you."
        confirmLabel="Block"
        destructive
      />
    </>
  );
}
