"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string;
  viewerId: string | null;
  authorPrivate: boolean;
  like: number;
  samehere: number;
  repost: number;
  commentCount: number;
  mineLike: boolean;
  mineSamehere: boolean;
  mineRepost: boolean;
  mineBookmark: boolean;
};

// All icons draw on the same 24x24 viewBox at 20px so they read the same size.
// Thicker fully-rounded strokes give them a soft, consistent feel.
const svg = "h-5 w-5";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
// Filled icons flip to solid when active (Twitter/IG-style) for a clear on-state.
const fillIf = (on?: boolean) => (on ? "currentColor" : "none");
const IconHeart = ({ on }: { on?: boolean }) => (<svg className={svg} {...stroke} fill={fillIf(on)}><path d="M19 14c1.49-1.46 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" /></svg>);
// Two people = the "SameHere" reaction (this is me too). Fills solid when active.
const IconSame = ({ on }: { on?: boolean }) => (
  <svg className={svg} {...stroke} fill={fillIf(on)}>
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1Z" />
    <circle cx="17" cy="8.5" r="2.8" />
    <path d="M16 13.4A5.5 5.5 0 0 1 21.5 19v1" />
  </svg>
);
const IconComment = () => (<svg className={svg} {...stroke}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /></svg>);
// Arrows don't read as "filled"; the green color carries the reposted state.
const IconRepost = () => (<svg className={svg} {...stroke}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>);
const IconBookmark = ({ on }: { on?: boolean }) => (<svg className={svg} {...stroke} fill={fillIf(on)}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></svg>);

export default function ReactionRow(props: Props) {
  const { postId, viewerId, authorPrivate, commentCount } = props;
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

  // Optimistic: flip local state first, then write; roll back on error. No global
  // busy lock — each button acts independently (so clicking one never dims the
  // others), and the tables' unique constraints keep rapid clicks safe.

  async function toggleReaction(type: "like" | "samehere") {
    if (!viewerId) return;
    const mine = type === "like" ? s.mineLike : s.mineSamehere;
    const d = mine ? -1 : 1;
    setS((p) => (type === "like" ? { ...p, mineLike: !mine, like: p.like + d } : { ...p, mineSamehere: !mine, samehere: p.samehere + d }));
    const { error } = mine
      ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert({ post_id: postId, user_id: viewerId, type });
    if (error) setS((p) => (type === "like" ? { ...p, mineLike: mine, like: p.like - d } : { ...p, mineSamehere: mine, samehere: p.samehere - d }));
  }

  async function toggleRepost() {
    if (!viewerId || authorPrivate) return;
    const mine = s.mineRepost;
    const d = mine ? -1 : 1;
    setS((p) => ({ ...p, mineRepost: !mine, repost: p.repost + d }));
    const { error } = mine
      ? await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", viewerId)
      : await supabase.from("reposts").insert({ post_id: postId, user_id: viewerId });
    if (error) setS((p) => ({ ...p, mineRepost: mine, repost: p.repost - d }));
  }

  async function toggleBookmark() {
    if (!viewerId) return;
    const mine = s.mineBookmark;
    setS((p) => ({ ...p, mineBookmark: !mine }));
    const { error } = mine
      ? await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", viewerId)
      : await supabase.from("bookmarks").insert({ post_id: postId, user_id: viewerId });
    if (error) setS((p) => ({ ...p, mineBookmark: mine }));
  }

  const base = "flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-40";
  const dim = "hover:text-[var(--ink)]";

  return (
    <div className="mt-3 flex items-center gap-5 text-[var(--ink-muted)]">
      <button type="button" onClick={() => toggleReaction("like")} disabled={!viewerId} aria-pressed={s.mineLike} aria-label={s.mineLike ? "Liked" : "Like"}
        className={`${base} ${s.mineLike ? "text-[#f4245e]" : dim}`}>
        <IconHeart on={s.mineLike} />{s.like > 0 && <span>{s.like}</span>}
      </button>

      <button type="button" onClick={() => toggleReaction("samehere")} disabled={!viewerId} aria-pressed={s.mineSamehere} aria-label={s.mineSamehere ? "SameHere added" : "SameHere — this is me too"}
        className={`${base} ${s.mineSamehere ? "text-[var(--blue)]" : dim}`}>
        <IconSame on={s.mineSamehere} />{s.samehere > 0 && <span>{s.samehere}</span>}
      </button>

      <Link href={`/post/${postId}`} aria-label="Comments" className={`${base} font-normal ${dim}`}>
        <IconComment />{commentCount > 0 && <span>{commentCount}</span>}
      </Link>

      <button type="button" onClick={toggleRepost} disabled={!viewerId || authorPrivate}
        aria-pressed={s.mineRepost} aria-label={authorPrivate ? "Reposting is off for private accounts" : s.mineRepost ? "Reposted" : "Repost"} title={authorPrivate ? "Private posts can't be reposted" : undefined}
        className={`${base} ${s.mineRepost ? "text-[#00ba7c]" : dim}`}>
        <IconRepost />{s.repost > 0 && <span>{s.repost}</span>}
      </button>

      <button type="button" onClick={toggleBookmark} disabled={!viewerId} aria-pressed={s.mineBookmark} aria-label={s.mineBookmark ? "Bookmarked" : "Bookmark"}
        className={`${base} ml-auto ${s.mineBookmark ? "text-[var(--blue)]" : dim}`}>
        <IconBookmark on={s.mineBookmark} />
      </button>
    </div>
  );
}
