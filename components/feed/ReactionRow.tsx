"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";
import Menu from "@/components/ui/Menu";
import QuoteRepostModal from "./QuoteRepostModal";
import type { FeedPost } from "./PostCard";

type Props = {
  postId: string;
  quoteId?: string;
  post?: FeedPost;
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
  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition hover:bg-[var(--featured-surface)] disabled:opacity-40";

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
  const { postId, quoteId, post, viewerId, authorPrivate, commentCount, compact = false, hideComments = false } = props;
  const [supabase] = useState(createClient);
  const targetCol = quoteId ? ("repost_id" as const) : ("post_id" as const);
  const targetId = quoteId ?? postId;
  const commentsHref = quoteId ? `/quote/${quoteId}` : `/post/${postId}`;
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);
  const [s, setS] = useState({
    samehere: props.samehere,
    repost: props.repost,
    mineSamehere: props.mineSamehere,
    mineRepost: props.mineRepost,
    mineBookmark: props.mineBookmark,
  });

  async function toggleReaction(type: "samehere") {
    if (!viewerId) return;
    const mine = s.mineSamehere;
    const d = mine ? -1 : 1;
    setS((p) => ({ ...p, mineSamehere: !mine, samehere: p.samehere + d }));
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
          onClick={() => toggleReaction("samehere")}
          disabled={!viewerId}
          aria-pressed={s.mineSamehere}
          aria-label={s.mineSamehere ? "SameHere added" : "SameHere"}
          className={`${action} ${sameColor(s.mineSamehere)}`}
        >
          <IconSame on={s.mineSamehere} />
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

        <Menu
          placement="top"
          align="start"
          customTrigger
          open={post ? repostMenu : false}
          onOpenChange={setRepostMenu}
          trigger={
            <ActionButton
              onClick={() => {
                if (authorPrivate) return;
                if (post) setRepostMenu((o) => !o);
                else toggleRepost();
              }}
              disabled={!viewerId || authorPrivate}
              aria-pressed={s.mineRepost}
              aria-label={authorPrivate ? "Reposting is off for private accounts" : s.mineRepost ? "Reposted" : "Repost"}
              title={authorPrivate ? "Private posts can't be reposted" : undefined}
              className={`${action} ${repostColor(s.mineRepost)}`}
            >
              <IconRepost />
              {s.repost > 0 && <span>{s.repost}</span>}
            </ActionButton>
          }
        >
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
        </Menu>

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
