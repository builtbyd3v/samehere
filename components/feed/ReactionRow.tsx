"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconHeart, IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";

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
  compact?: boolean;
};

const action =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition hover:bg-[var(--featured-surface)] disabled:opacity-40";

// Neutral until the viewer interacts — the accent color only appears once the
// reaction is "mine". Hover previews the accent so the affordance stays clear.
const likeColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[#f4245e]" : "text-[var(--ink-muted)] hover:text-[#f4245e]";
const sameColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[var(--blue)]" : "text-[var(--ink-muted)] hover:text-[var(--blue)]";
const repostColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[#00ba7c]" : "text-[var(--ink-muted)] hover:text-[#00ba7c]";
const bookmarkColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[var(--blue)]" : "text-[var(--ink-muted)] hover:text-[var(--blue)]";
const commentColor = "text-[var(--ink-muted)] hover:text-[var(--ink)]";

export default function ReactionRow(props: Props) {
  const { postId, viewerId, authorPrivate, commentCount, compact = false } = props;
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

  async function toggleReaction(type: "like" | "samehere") {
    if (!viewerId) return;
    const mine = type === "like" ? s.mineLike : s.mineSamehere;
    const d = mine ? -1 : 1;
    setS((p) =>
      type === "like"
        ? { ...p, mineLike: !mine, like: p.like + d }
        : { ...p, mineSamehere: !mine, samehere: p.samehere + d },
    );
    const { error } = mine
      ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert({ post_id: postId, user_id: viewerId, type });
    if (error)
      setS((p) =>
        type === "like"
          ? { ...p, mineLike: mine, like: p.like - d }
          : { ...p, mineSamehere: mine, samehere: p.samehere - d },
      );
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

  return (
    <div className={`${compact ? "mt-3" : "mt-4"} flex flex-wrap items-center gap-0.5 border-t border-[var(--border)] pt-3`}>
      <button
        type="button"
        onClick={() => toggleReaction("like")}
        disabled={!viewerId}
        aria-pressed={s.mineLike}
        aria-label={s.mineLike ? "Liked" : "Like"}
        className={`${action} ${likeColor(s.mineLike)}`}
      >
        <IconHeart on={s.mineLike} />
        {s.like > 0 && <span>{s.like}</span>}
      </button>

      <button
        type="button"
        onClick={() => toggleReaction("samehere")}
        disabled={!viewerId}
        aria-pressed={s.mineSamehere}
        aria-label={s.mineSamehere ? "SameHere added" : "SameHere"}
        className={`${action} ${sameColor(s.mineSamehere)}`}
      >
        <IconSame on={s.mineSamehere} />
        {s.samehere > 0 && <span>{s.samehere}</span>}
      </button>

      <Link
        href={`/post/${postId}`}
        aria-label="Comments"
        className={`${action} font-normal ${commentColor}`}
      >
        <IconComment />
        {commentCount > 0 && <span>{commentCount}</span>}
      </Link>

      <button
        type="button"
        onClick={toggleRepost}
        disabled={!viewerId || authorPrivate}
        aria-pressed={s.mineRepost}
        aria-label={authorPrivate ? "Reposting is off for private accounts" : s.mineRepost ? "Reposted" : "Repost"}
        title={authorPrivate ? "Private posts can't be reposted" : undefined}
        className={`${action} ${repostColor(s.mineRepost)}`}
      >
        <IconRepost />
        {s.repost > 0 && <span>{s.repost}</span>}
      </button>

      <button
        type="button"
        onClick={toggleBookmark}
        disabled={!viewerId}
        aria-pressed={s.mineBookmark}
        aria-label={s.mineBookmark ? "Bookmarked" : "Bookmark"}
        className={`${action} ml-auto ${bookmarkColor(s.mineBookmark)}`}
      >
        <IconBookmark on={s.mineBookmark} />
      </button>
    </div>
  );
}
