"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type FollowState = "none" | "pending" | "following";

export default function FollowButton({
  targetId,
  initial,
  variant = "default",
  className = "",
}: {
  targetId: string;
  initial: FollowState;
  variant?: "default" | "pill";
  className?: string;
}) {
  const [supabase] = useState(createClient);
  const router = useRouter();
  const [state, setState] = useState<FollowState>(initial);
  const [busy, setBusy] = useState(false);

  // request_follow decides pending vs accepted server-side from the target's
  // privacy — the follower can't force acceptance.
  async function follow() {
    setBusy(true);
    const { data, error } = await supabase.rpc("request_follow", { p_target: targetId });
    setBusy(false);
    if (!error) {
      setState(data === "accepted" ? "following" : "pending");
      router.refresh();
    }
  }

  // Unfollow or cancel a pending request — both are just deleting our own row
  // (RLS pins the delete to follower_id = auth.uid()).
  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("follows").delete().eq("following_id", targetId);
    setBusy(false);
    if (!error) {
      setState("none");
      router.refresh();
    }
  }

  const shape = variant === "pill" ? "rounded-full px-4 py-2" : "rounded-md px-3 py-1.5";
  const press = "active:scale-[0.98] disabled:active:scale-100";

  if (state === "none") {
    return (
      <button
        type="button"
        onClick={follow}
        disabled={busy}
        className={`btn-inset bg-[var(--ink)] text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50 ${press} ${shape} ${className}`}
      >
        {busy ? "Following…" : "Follow"}
      </button>
    );
  }

  if (state === "pending") {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className={`border border-[var(--border-strong)] text-sm font-medium text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] active:opacity-80 disabled:opacity-50 ${press} ${shape} ${className}`}
      >
        Requested
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className={`group border border-[var(--border-strong)] text-sm font-medium transition hover:border-[var(--danger)] hover:bg-[var(--danger)]/[0.06] hover:text-[var(--danger)] active:opacity-80 disabled:opacity-50 ${press} ${shape} ${className}`}
    >
      <span className="group-hover:hidden">Following</span>
      <span className="hidden group-hover:inline">Unfollow</span>
    </button>
  );
}
