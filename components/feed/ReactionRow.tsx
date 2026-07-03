"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string;
  viewerId: string | null;
  authorPrivate: boolean;
  like: number;
  samehere: number;
  repost: number;
  mineLike: boolean;
  mineSamehere: boolean;
  mineRepost: boolean;
  mineBookmark: boolean;
};

const svg = "h-[18px] w-[18px]";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
const IconHeart = () => (<svg className={svg} {...stroke}><path d="M19 14c1.49-1.46 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" /></svg>);
// Two overlapping rings = the signature "SameHere" reaction.
const IconSame = () => (<svg className={svg} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></svg>);
const IconRepost = () => (<svg className={svg} {...stroke}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>);
const IconBookmark = () => (<svg className={svg} {...stroke}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></svg>);

export default function ReactionRow(props: Props) {
  const { postId, viewerId, authorPrivate } = props;
  const [supabase] = useState(createClient);
  const [s, setS] = useState({
    like: props.like,
    samehere: props.samehere,
    repost: props.repost,
    mineLike: props.mineLike,
    mineSamehere: props.mineSamehere,
    mineRepost: props.mineRepost,
    mineBookmark: props.mineBookmark,
  });
  const [busy, setBusy] = useState(false);

  // reactions (like/samehere) live in one table keyed by type.
  async function toggleReaction(type: "like" | "samehere") {
    if (!viewerId || busy) return;
    const mine = type === "like" ? s.mineLike : s.mineSamehere;
    const d = mine ? -1 : 1;
    setBusy(true);
    setS((p) => (type === "like" ? { ...p, mineLike: !mine, like: p.like + d } : { ...p, mineSamehere: !mine, samehere: p.samehere + d }));
    const { error } = mine
      ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert({ post_id: postId, user_id: viewerId, type });
    setBusy(false);
    if (error) setS((p) => (type === "like" ? { ...p, mineLike: mine, like: p.like - d } : { ...p, mineSamehere: mine, samehere: p.samehere - d }));
  }

  // repost: blocked on private authors (RLS enforces; button is also disabled).
  async function toggleRepost() {
    if (!viewerId || busy || authorPrivate) return;
    const mine = s.mineRepost;
    const d = mine ? -1 : 1;
    setBusy(true);
    setS((p) => ({ ...p, mineRepost: !mine, repost: p.repost + d }));
    const { error } = mine
      ? await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", viewerId)
      : await supabase.from("reposts").insert({ post_id: postId, user_id: viewerId });
    setBusy(false);
    if (error) setS((p) => ({ ...p, mineRepost: mine, repost: p.repost - d }));
  }

  // bookmark: private, no count.
  async function toggleBookmark() {
    if (!viewerId || busy) return;
    const mine = s.mineBookmark;
    setBusy(true);
    setS((p) => ({ ...p, mineBookmark: !mine }));
    const { error } = mine
      ? await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", viewerId)
      : await supabase.from("bookmarks").insert({ post_id: postId, user_id: viewerId });
    setBusy(false);
    if (error) setS((p) => ({ ...p, mineBookmark: mine }));
  }

  const base = "flex items-center gap-1.5 text-sm transition disabled:opacity-40";
  const dim = "hover:text-[var(--ink)]";

  return (
    <div className="mt-3 flex items-center gap-5 text-[var(--ink-muted)]">
      <button type="button" onClick={() => toggleReaction("like")} disabled={!viewerId || busy} aria-pressed={s.mineLike} aria-label="Like"
        className={`${base} ${s.mineLike ? "text-[var(--ink)]" : dim}`}>
        <IconHeart />{s.like > 0 && <span>{s.like}</span>}
      </button>

      <button type="button" onClick={() => toggleReaction("samehere")} disabled={!viewerId || busy} aria-pressed={s.mineSamehere} aria-label="SameHere — this is me too"
        className={`${base} ${s.mineSamehere ? "text-[var(--blue)]" : dim}`}>
        <IconSame />{s.samehere > 0 && <span>{s.samehere}</span>}
      </button>

      <button type="button" onClick={toggleRepost} disabled={!viewerId || busy || authorPrivate}
        aria-pressed={s.mineRepost} aria-label={authorPrivate ? "Reposting is off for private accounts" : "Repost"} title={authorPrivate ? "Private posts can't be reposted" : undefined}
        className={`${base} ${s.mineRepost ? "text-[var(--ink)]" : dim}`}>
        <IconRepost />{s.repost > 0 && <span>{s.repost}</span>}
      </button>

      <button type="button" onClick={toggleBookmark} disabled={!viewerId || busy} aria-pressed={s.mineBookmark} aria-label="Bookmark"
        className={`${base} ml-auto ${s.mineBookmark ? "text-[var(--ink)]" : dim}`}>
        <IconBookmark />
      </button>
    </div>
  );
}
