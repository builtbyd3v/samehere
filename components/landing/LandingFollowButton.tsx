"use client";

import { useState } from "react";

type State = "none" | "pending" | "following";

export default function LandingFollowButton() {
  const [state, setState] = useState<State>("none");
  const [busy, setBusy] = useState(false);

  async function follow() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 180));
    setState("following");
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 180));
    setState("none");
    setBusy(false);
  }

  if (state === "none") {
    return (
      <button
        type="button"
        onClick={follow}
        disabled={busy}
        className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
      >
        Follow
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="group shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80 disabled:opacity-50"
    >
      <span className="group-hover:hidden">Following</span>
      <span className="hidden group-hover:inline">Unfollow</span>
    </button>
  );
}
