"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { IconHeart, IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";
import QuoteRepostModal from "./QuoteRepostModal";
import type { FeedPost } from "./PostCard";

type Props = {
  postId: string;
  quoteId?: string;
  post?: FeedPost;
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
  hideComments?: boolean;
};

export const action =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition hover:bg-[var(--featured-surface)] disabled:opacity-40";

const inactive = "text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]";

export const likeColor = (on: boolean) =>
  on ? "bg-[var(--featured-surface)] text-[#f4245e]" : inactive;
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
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileTap={!disabled && !reduce ? { scale: 0.9 } : undefined}
      className={className}
      {...a11y}
    >
      {children}
    </motion.button>
  );
}

export default function ReactionRow(props: Props) {
  const { postId, quoteId, post, viewerId, authorPrivate, commentCount, compact = false, hideComments = false } = props;
  const [supabase] = useState(createClient);
  const targetCol = quoteId ? ("repost_id" as const) : ("post_id" as const);
  const targetId = quoteId ?? postId;
  const commentsHref = quoteId ? `/quote/${quoteId}` : `/post/${postId}`;
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);
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
      ? await supabase.from("reactions").delete().eq(targetCol, targetId).eq("user_id", viewerId).eq("type", type)
      : await supabase.from("reactions").insert(
          quoteId
            ? { repost_id: quoteId, user_id: viewerId, type }
            : { post_id: postId, user_id: viewerId, type },
        );
    if (error)
      setS((p) =>
        type === "like"
          ? { ...p, mineLike: mine, like: p.like - d }
          : { ...p, mineSamehere: mine, samehere: p.samehere - d },
      );
  }

  async function toggleRepost() {
    if (!viewerId || authorPrivate) return;
    setRepostMenu(false);
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
          onClick={() => toggleReaction("like")}
          disabled={!viewerId}
          aria-pressed={s.mineLike}
          aria-label={s.mineLike ? "Liked" : "Like"}
          className={`${action} ${likeColor(s.mineLike)}`}
        >
          <IconHeart on={s.mineLike} />
          {s.like > 0 && <span>{s.like}</span>}
        </ActionButton>

        <ActionButton
          onClick={() => toggleReaction("samehere")}
          disabled={!viewerId}
          aria-pressed={s.mineSamehere}
          aria-label={s.mineSamehere ? "SameHere added" : "SameHere"}
          className={`${action} ${sameColor(s.mineSamehere)}`}
        >
          <IconSame on={s.mineSamehere} />
          {s.samehere > 0 && <span>{s.samehere}</span>}
        </ActionButton>

        {!hideComments && (
          <Link href={commentsHref} aria-label="Comments" className={`${action} font-normal ${commentColor}`}>
            <IconComment />
            {commentCount > 0 && <span>{commentCount}</span>}
          </Link>
        )}

        <div className="relative">
          <ActionButton
            onClick={() => {
              if (authorPrivate) return;
              if (post) setRepostMenu((o) => !o);
              else toggleRepost();
            }}
            disabled={!viewerId || authorPrivate}
            aria-pressed={s.mineRepost}
            aria-expanded={repostMenu}
            aria-label={authorPrivate ? "Reposting is off for private accounts" : s.mineRepost ? "Reposted" : "Repost"}
            title={authorPrivate ? "Private posts can't be reposted" : undefined}
            className={`${action} ${repostColor(s.mineRepost)}`}
          >
            <IconRepost />
            {s.repost > 0 && <span>{s.repost}</span>}
          </ActionButton>
          {repostMenu && post && (
            <>
              <button type="button" className="fixed inset-0 z-10" aria-label="Close menu" onClick={() => setRepostMenu(false)} />
              <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[9rem] rounded-lg border border-[var(--border)] bg-[var(--surface-card)] py-1 shadow-lg animate-[menu-pop_120ms_ease] motion-reduce:animate-none">
                <button
                  type="button"
                  onClick={toggleRepost}
                  className="block w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--featured-surface)] active:scale-[0.98]"
                >
                  {s.mineRepost ? "Undo repost" : "Repost"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepostMenu(false);
                    setQuoteOpen(true);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--featured-surface)] active:scale-[0.98]"
                >
                  Quote
                </button>
              </div>
            </>
          )}
        </div>

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

      {post && viewerId && (
        <QuoteRepostModal
          post={post}
          viewerId={viewerId}
          open={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          onDone={() =>
            setS((p) => ({
              ...p,
              mineRepost: true,
              repost: p.mineRepost ? p.repost : p.repost + 1,
            }))
          }
        />
      )}
    </>
  );
}
