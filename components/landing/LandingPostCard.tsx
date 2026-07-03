"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconHeart, IconSame, IconComment, IconRepost, IconBookmark } from "@/components/icons";
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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [bookmarked, setBookmarked] = useState(false);

  const base = "flex items-center gap-1.5 text-sm font-medium transition";
  const dim = interactive ? "cursor-pointer hover:text-[var(--ink)]" : "cursor-default";

  function toggleSamehere() {
    if (!interactive) return;
    const next = !samehereOn;
    setSamehereOn(next);
    setSamehereCount((n) => n + (next ? 1 : -1));
  }

  function toggleLike() {
    if (!interactive) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
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
    <article className="border-b border-[var(--border)] px-1 py-5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <img
          src={`https://picsum.photos/seed/${post.avatarSeed}/72/72`}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
        />
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-medium">{post.name}</span>
            <span className="text-[var(--ink-muted)]">@{post.username}</span>
          </div>
          <p className="text-[var(--ink-muted)]">
            {post.school ? `${post.school} · ` : ""}
            <span>{formatTimeAgo(post.minutesAgo)}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-[var(--ink)]">
        {post.content}
      </p>

      <div className="mt-3 flex items-center gap-5 text-[var(--ink-muted)]">
        <motion.button
          type="button"
          onClick={toggleLike}
          disabled={!interactive}
          whileTap={interactive && !reduce ? { scale: 0.92 } : undefined}
          aria-pressed={liked}
          className={`${base} ${liked ? "text-[#f4245e]" : dim}`}
        >
          <IconHeart on={liked} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </motion.button>

        <motion.button
          type="button"
          onClick={toggleSamehere}
          disabled={!interactive}
          whileTap={interactive && !reduce ? { scale: 0.92 } : undefined}
          aria-pressed={samehereOn}
          className={`${base} ${samehereOn ? "text-[var(--blue)]" : dim}`}
        >
          <IconSame on={samehereOn} />
          {samehereCount > 0 && <span>{samehereCount}</span>}
        </motion.button>

        <span className={`${base} font-normal`}>
          <IconComment />
          {post.comments > 0 && <span>{post.comments}</span>}
        </span>

        <motion.button
          type="button"
          onClick={toggleRepost}
          disabled={!interactive}
          whileTap={interactive && !reduce ? { scale: 0.92 } : undefined}
          aria-pressed={reposted}
          className={`${base} ${reposted ? "text-[#00ba7c]" : dim}`}
        >
          <IconRepost />
          {repostCount > 0 && <span>{repostCount}</span>}
        </motion.button>

        <motion.button
          type="button"
          onClick={toggleBookmark}
          disabled={!interactive}
          whileTap={interactive && !reduce ? { scale: 0.92 } : undefined}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Bookmarked" : "Bookmark"}
          className={`${base} ml-auto ${bookmarked ? "text-[var(--blue)]" : dim}`}
        >
          <IconBookmark on={bookmarked} />
        </motion.button>
      </div>
    </article>
  );
}
