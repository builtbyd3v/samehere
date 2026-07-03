"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string;
  viewerId: string | null;
  like: number;
  samehere: number;
  mineLike: boolean;
  mineSamehere: boolean;
};

// Two overlapping rings = the signature "SameHere" reaction.
const IconSame = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[18px] w-[18px]">
    <circle cx="9" cy="12" r="5.5" />
    <circle cx="15" cy="12" r="5.5" />
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    <path d="M19 14c1.49-1.46 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" />
  </svg>
);

export default function ReactionRow(props: Props) {
  const { postId, viewerId } = props;
  const [supabase] = useState(createClient);
  const [state, setState] = useState({
    like: props.like,
    samehere: props.samehere,
    mineLike: props.mineLike,
    mineSamehere: props.mineSamehere,
  });
  const [busy, setBusy] = useState(false);

  // Toggle a reaction. Optimistic: flip local state first, then write; roll back
  // on error. RLS pins the insert/delete to the viewer's own rows.
  async function toggle(type: "like" | "samehere") {
    if (!viewerId || busy) return;
    const mine = type === "like" ? state.mineLike : state.mineSamehere;
    const delta = mine ? -1 : 1;

    setBusy(true);
    setState((s) =>
      type === "like"
        ? { ...s, mineLike: !mine, like: s.like + delta }
        : { ...s, mineSamehere: !mine, samehere: s.samehere + delta }
    );

    const { error } = mine
      ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert({ post_id: postId, user_id: viewerId, type });

    setBusy(false);
    if (error) {
      setState((s) =>
        type === "like"
          ? { ...s, mineLike: mine, like: s.like - delta }
          : { ...s, mineSamehere: mine, samehere: s.samehere - delta }
      );
    }
  }

  const btn = "flex items-center gap-1.5 text-sm transition disabled:opacity-50";

  return (
    <div className="mt-3 flex items-center gap-5 text-[var(--ink-muted)]">
      <button
        type="button"
        onClick={() => toggle("like")}
        disabled={!viewerId || busy}
        aria-pressed={state.mineLike}
        aria-label="Like"
        className={`${btn} ${state.mineLike ? "text-[var(--ink)]" : "hover:text-[var(--ink)]"}`}
      >
        <IconHeart />
        {state.like > 0 && <span>{state.like}</span>}
      </button>

      <button
        type="button"
        onClick={() => toggle("samehere")}
        disabled={!viewerId || busy}
        aria-pressed={state.mineSamehere}
        aria-label="SameHere — this is me too"
        className={`${btn} ${state.mineSamehere ? "text-[var(--blue)]" : "hover:text-[var(--ink)]"}`}
      >
        <IconSame />
        {state.samehere > 0 && <span>{state.samehere}</span>}
      </button>
    </div>
  );
}
