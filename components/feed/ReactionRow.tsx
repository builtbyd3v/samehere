"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getBrowserClient } from "@/lib/supabase/client";
import { IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";
import { useRepostState, setRepostState } from "@/lib/repost-store";

type Props = {
  postId: string;
  quoteId?: string;
  viewerId: string | null;
  authorPrivate: boolean;
  samehere: number;
  repost: number;
  commentCount: number;
  mineSamehere: boolean;
  mineRepost: boolean;
  mineBookmark: boolean;
  compact?: boolean;
  hideComments?: boolean;
};

export const action =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition duration-150 hover:bg-[var(--featured-surface)] active:translate-y-[1px] disabled:opacity-40 disabled:active:translate-y-0";

const inactive = "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]";

export const sameColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[var(--blue)]" : inactive;
export const repostColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[#00ba7c]" : inactive;
export const bookmarkColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[var(--blue)]" : inactive;
export const commentColor = "text-[var(--ink-muted)] hover:text-[var(--ink)]";

function ActionButton({
  children,
  className,
  onClick,
  disabled,
  title,
  ...a11y
}: {
  children: React.ReactNode;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn-tap ${className}`}
      {...a11y}
    >
      {children}
    </button>
  );
}

export default function ReactionRow(props: Props) {
  const { postId, quoteId, viewerId, authorPrivate, commentCount, compact = false, hideComments = false } = props;
  const [supabase] = useState(getBrowserClient);
  const targetCol = quoteId ? ("repost_id" as const) : ("post_id" as const);
  const targetId = quoteId ?? postId;
  const commentsHref = quoteId ? `/quote/${quoteId}` : `/post/${postId}`;
  const [pop, setPop] = useState(false);
  const reduceMotion = useReducedMotion();
  const [s, setS] = useState({
    samehere: props.samehere,
    mineSamehere: props.mineSamehere,
    mineBookmark: props.mineBookmark,
  });
  // Repost lives in a shared store, not local state -- see lib/repost-store.ts.
  const repostState = useRepostState(postId, { mine: props.mineRepost, count: props.repost });

  async function toggleReaction(type: "samehere") {
    if (!viewerId) return;
    const mine = s.mineSamehere;
    const d = mine ? -1 : 1;
    setS((p) => ({ ...p, mineSamehere: !mine, samehere: p.samehere + d }));
    if (!mine && !reduceMotion) {
      // Activating (not undoing): fire the signature spring micro-burst.
      setPop(true);
      setTimeout(() => setPop(false), 260);
    }
    const { error } = mine
      ? await supabase.from("reactions").delete().eq(targetCol, targetId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert(
          quoteId
            ? { repost_id: quoteId, user_id: viewerId, type }
            : { post_id: postId, user_id: viewerId, type },
        );
    if (error) setS((p) => ({ ...p, mineSamehere: mine, samehere: p.samehere - d }));
  }

  async function toggleRepost() {
    if (!viewerId || authorPrivate) return;
    const { mine, count } = repostState;
    setRepostState(postId, { mine: !mine, count: count + (mine ? -1 : 1) });
    // quote_text IS NULL so undoing a repost can never delete a legacy quote
    // repost, which shares this table under unique(post_id, user_id).
    const { error } = mine
      ? await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", viewerId).is("quote_text", null)
      : await supabase.from("reposts").insert({ post_id: postId, user_id: viewerId });
    if (error) setRepostState(postId, { mine, count });
  }

  async function toggleBookmark() {
    if (!viewerId) return;
    const mine = s.mineBookmark;
    setS((p) => ({ ...p, mineBookmark: !mine }));
    const { error } = mine
      ? await supabase.from("bookmarks").delete().eq(targetCol, targetId).eq("user_id", viewerId)
      : await supabase.from("bookmarks").insert(
          quoteId
            ? { repost_id: quoteId, user_id: viewerId }
            : { post_id: postId, user_id: viewerId },
        );
    if (error) setS((p) => ({ ...p, mineBookmark: mine }));
  }

  return (
    <>
      <div className={`${compact ? "mt-3" : "mt-4"} flex flex-wrap items-center gap-0.5 border-t border-[var(--border)] pt-3`}>
        <ActionButton
          onClick={() => toggleReaction("samehere")}
          disabled={!viewerId}
          aria-pressed={s.mineSamehere}
          aria-label={s.mineSamehere ? "SameHere added" : "SameHere"}
          className={`${action} ${sameColor(s.mineSamehere)}`}
        >
          <motion.span
            className="inline-flex"
            animate={{ scale: pop ? 1.25 : 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <IconSame on={s.mineSamehere} />
          </motion.span>
          {s.samehere > 0 && (
            <span className="same-tick inline-block tabular-nums" key={s.samehere}>
              {s.samehere}
            </span>
          )}
        </ActionButton>

        {!hideComments && (
          <Link href={commentsHref} aria-label="Comments" className={`${action} font-normal ${commentColor}`}>
            <IconComment />
            {commentCount > 0 && <span>{commentCount}</span>}
          </Link>
        )}

        <ActionButton
          onClick={toggleRepost}
          disabled={!viewerId || authorPrivate}
          aria-pressed={repostState.mine}
          aria-label={
            authorPrivate ? "Reposting is off for private accounts" : repostState.mine ? "Reposted" : "Repost"
          }
          title={authorPrivate ? "Private posts can't be reposted" : undefined}
          className={`${action} ${repostColor(repostState.mine)}`}
        >
          <IconRepost />
          {repostState.count > 0 && <span>{repostState.count}</span>}
        </ActionButton>

        <ActionButton
          onClick={toggleBookmark}
          disabled={!viewerId}
          aria-pressed={s.mineBookmark}
          aria-label={s.mineBookmark ? "Bookmarked" : "Bookmark"}
          className={`${action} ml-auto ${bookmarkColor(s.mineBookmark)}`}
        >
          <IconBookmark on={s.mineBookmark} />
        </ActionButton>
      </div>
    </>
  );
}
