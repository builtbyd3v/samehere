"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FollowState = "none" | "pending" | "following";

export default function FollowButton({ targetId, initial }: { targetId: string; initial: FollowState }) {
  const [supabase] = useState(createClient);
  const [state, setState] = useState<FollowState>(initial);
  const [busy, setBusy] = useState(false);

  // request_follow decides pending vs accepted server-side from the target's
  // privacy — the follower can't force acceptance.
  async function follow() {
    setBusy(true);
    const { data, error } = await supabase.rpc("request_follow", { p_target: targetId });
    setBusy(false);
    if (!error) setState(data === "accepted" ? "following" : "pending");
  }

  // Unfollow or cancel a pending request — both are just deleting our own row
  // (RLS pins the delete to follower_id = auth.uid()).
  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("follows").delete().eq("following_id", targetId);
    setBusy(false);
    if (!error) setState("none");
  }

  if (state === "none") {
    return (
      <button type="button" onClick={follow} disabled={busy}
        className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50">
        Follow
      </button>
    );
  }

  // pending or following — both actions remove the row. Label differs.
  return (
    <button type="button" onClick={remove} disabled={busy}
      className="group shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80 disabled:opacity-50">
      {state === "pending" ? "Requested" : (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      )}
    </button>
  );
}
