"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";
import {
  action,
  sameColor,
  repostColor,
  bookmarkColor,
  commentColor,
} from "@/components/feed/ReactionRow";
import { type DemoPost, formatTimeAgo } from "@/lib/landing/demo-data";

type Props = {
  post: DemoPost;
  interactive?: boolean;
  highlightSamehere?: boolean;
};

export default function LandingPostCard({ post, interactive = false, highlightSamehere = false }: Props) {
  const reduce = useReducedMotion();
  const [samehereOn, setSamehereOn] = useState(highlightSamehere);
  const [samehereCount, setSamehereCount] = useState(post.samehere);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [bookmarked, setBookmarked] = useState(false);

  const tap = interactive && !reduce ? { whileTap: { scale: 0.9 } } : {};

  function toggleSamehere() {
    if (!interactive) return;
    const next = !samehereOn;
    setSamehereOn(next);
    setSamehereCount((n) => n + (next ? 1 : -1));
  }

  function toggleRepost() {
    if (!interactive) return;
    const next = !reposted;
    setReposted(next);
    setRepostCount((n) => n + (next ? 1 : -1));
  }

  function toggleBookmark() {
    if (!interactive) return;
    setBookmarked((b) => !b);
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <img
          src={`https://picsum.photos/seed/${post.avatarSeed}/72/72`}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-semibold text-[var(--ink)]">{post.name}</span>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            <span>@{post.username}</span>
            {post.school && (
              <>
                <span className="mx-1 text-[var(--ink-faint)]">·</span>
                <span>{post.school}</span>
              </>
            )}
            <span className="mx-1 text-[var(--ink-faint)]">·</span>
            <span>{formatTimeAgo(post.minutesAgo)}</span>
          </p>

          <p className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]">
            {post.content}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-0.5 border-t border-[var(--border)] pt-3">
        <motion.button
          type="button"
          onClick={toggleSamehere}
          disabled={!interactive}
          {...tap}
          aria-pressed={samehereOn}
          className={`${action} ${sameColor(samehereOn)} ${interactive ? "cursor-pointer" : "cursor-default"}`}
        >
          <IconSame on={samehereOn} />
          {samehereCount > 0 && <span>{samehereCount}</span>}
        </motion.button>

        <span className={`${action} font-normal ${commentColor}`}>
          <IconComment />
          {post.comments > 0 && <span>{post.comments}</span>}
        </span>

        <motion.button
          type="button"
          onClick={toggleRepost}
          disabled={!interactive}
          {...tap}
          aria-pressed={reposted}
          className={`${action} ${repostColor(reposted)} ${interactive ? "cursor-pointer" : "cursor-default"}`}
        >
          <IconRepost />
          {repostCount > 0 && <span>{repostCount}</span>}
        </motion.button>

        <motion.button
          type="button"
          onClick={toggleBookmark}
          disabled={!interactive}
          {...tap}
          aria-pressed={bookmarked}
          className={`${action} ml-auto ${bookmarkColor(bookmarked)} ${interactive ? "cursor-pointer" : "cursor-default"}`}
        >
          <IconBookmark on={bookmarked} />
        </motion.button>
      </div>
    </article>
  );
}
