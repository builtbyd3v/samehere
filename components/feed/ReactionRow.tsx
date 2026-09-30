"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, MessageCircle, Repeat2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { IconSame } from "@/components/icons";
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
  hideComments?: boolean;
  /** Comment link reads "{n} answers" (Stuck posts). */
  answers?: boolean;
  /** Contextual call to action, right-aligned before the bookmark. */
  cta?: React.ReactNode;
};

// Transitions come from the global `a, button` rule in app/globals.css.
// 44px hit area on phones, 30px rows from lg (artboard).
const action =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 hover:bg-[var(--fill-2)] hover:text-[var(--ink)] active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100 lg:h-[30px] lg:min-h-0 lg:min-w-0";

const ICON = { size: 15, strokeWidth: 1.7, "aria-hidden": true } as const;

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
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className} {...a11y}>
      {children}
    </button>
  );
}

export default function ReactionRow(props: Props) {
  const { postId, quoteId, viewerId, authorPrivate, commentCount, hideComments = false, answers = false, cta } = props;
  const [supabase] = useState(getBrowserClient);
  const targetCol = quoteId ? ("repost_id" as const) : ("post_id" as const);
  const targetId = quoteId ?? postId;
  const commentsHref = quoteId ? `/quote/${quoteId}` : `/post/${postId}`;
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
    <div className="-ml-2 flex flex-wrap items-center gap-1 text-[13px] text-[var(--muted)]">
      <ActionButton
        onClick={() => toggleReaction("samehere")}
        disabled={!viewerId}
        aria-pressed={s.mineSamehere}
        aria-label={s.mineSamehere ? "SameHere added" : "SameHere"}
        className={`${action}${s.mineSamehere ? " text-[var(--ink)]" : ""}`}
      >
        <IconSame on={s.mineSamehere} className="size-[15px]" />
        <span className="hidden sm:inline">Same here</span>
        {s.samehere > 0 && <span className="tabular-nums">{s.samehere}</span>}
      </ActionButton>

      {!hideComments && (
        <Link href={commentsHref} aria-label={answers ? `${commentCount} answers` : "Comments"} className={action}>
          <MessageCircle {...ICON} />
          {answers ? (
            <>
              <span className="tabular-nums">{commentCount}</span>
              <span className="hidden sm:inline"> {commentCount === 1 ? "answer" : "answers"}</span>
            </>
          ) : (
            commentCount > 0 && <span className="tabular-nums">{commentCount}</span>
          )}
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
        className={`${action}${repostState.mine ? " text-[var(--green)]" : ""}`}
      >
        <Repeat2 {...ICON} />
        {repostState.count > 0 && <span className="tabular-nums">{repostState.count}</span>}
      </ActionButton>

      <span className="grow" />
      {cta}

      <ActionButton
        onClick={toggleBookmark}
        disabled={!viewerId}
        aria-pressed={s.mineBookmark}
        aria-label={s.mineBookmark ? "Bookmarked" : "Bookmark"}
        className={`${action}${s.mineBookmark ? " text-[var(--accent)]" : ""}`}
      >
        <Bookmark {...ICON} fill={s.mineBookmark ? "currentColor" : "none"} />
      </ActionButton>
    </div>
  );
}
