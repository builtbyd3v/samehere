"use client";

import Link from "next/link";
import AvatarBase from "@/components/ui/Avatar";
import MentionText from "@/components/ui/MentionText";
import PostCard from "@/components/feed/PostCard";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import UserBadges from "@/components/profile/UserBadges";
import ReactionRow from "@/components/feed/ReactionRow";
import QuoteBodyLink from "@/components/feed/QuoteBodyLink";
import QuoteMenu from "@/components/feed/QuoteMenu";
import LocalTime from "@/components/ui/LocalTime";
import type { FeedPost } from "@/components/feed/PostCard";

export type QuotedRepost = {
  id: string;
  quote_text: string;
  created_at: string;
  reposter_id: string;
  reposter: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_pro: boolean;
    is_founder: boolean;
    is_campus_founder: boolean;
    verified_student: boolean;
  };
  original: FeedPost;
  samehere_count: number;
  comment_count: number;
  mine_samehere: boolean;
  mine_bookmark: boolean;
};

export default function QuotedRepostCard({
  item,
  viewerId,
  variant = "feed",
}: {
  item: QuotedRepost;
  viewerId: string | null;
  variant?: "feed" | "detail";
}) {
  const r = item.reposter;
  const name = r.display_name ?? r.username;
  const detail = variant === "detail";
  const linked = !detail;
  const original = item.original;
  const authorPrivate = !!original.author?.is_private;

  return (
    <article
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5${
        detail ? "" : " transition-colors duration-200 hover:border-[var(--border-strong)]"
      }`}
    >
      <div className="flex gap-3">
        <ProfileHoverLink href={`/profile/${r.username}`} username={r.username} className="shrink-0">
          <AvatarBase src={r.avatar_url} seed={r.username} name={name} className="h-10 w-10 rounded-full border border-[var(--border)] text-sm" pro={r.is_pro} />
        </ProfileHoverLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5">
                <ProfileHoverLink href={`/profile/${r.username}`} username={r.username} className="font-semibold hover:underline">
                  {name}
                </ProfileHoverLink>
                <UserBadges isPro={r.is_pro} isFounder={r.is_founder} isCampusFounder={r.is_campus_founder} isVerifiedStudent={r.verified_student} />
                <span className="text-[13px] text-[var(--ink-muted)]">@{r.username}</span>
                <span className="text-[13px] text-[var(--ink-faint)]">·</span>
                {linked ? (
                  <Link href={`/quote/${item.id}`} className="text-[13px] text-[var(--ink-faint)] hover:text-[var(--ink)] hover:underline">
                    <LocalTime iso={item.created_at} variant="ago" />
                  </Link>
                ) : (
                  <LocalTime iso={item.created_at} variant="ago" className="text-[13px] text-[var(--ink-faint)]" />
                )}
              </div>
            </div>
            <QuoteMenu
              quoteId={item.id}
              quoteText={item.quote_text}
              reposterId={item.reposter_id}
              reposterUsername={r.username}
              originalPostId={original.id}
              viewerId={viewerId}
            />
          </div>

          {linked ? (
            <QuoteBodyLink quoteId={item.id}>
              <p className="max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55]">
                <MentionText>{item.quote_text}</MentionText>
              </p>
            </QuoteBodyLink>
          ) : (
            <p className="mt-2 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55]">
              <MentionText>{item.quote_text}</MentionText>
            </p>
          )}

          <div className="mt-3">
            <PostCard post={original} viewerId={viewerId} variant="embedded" embeddedLinked />
          </div>

          <ReactionRow
            quoteId={item.id}
            postId={original.id}
            post={original}
            viewerId={viewerId}
            authorPrivate={authorPrivate}
            samehere={item.samehere_count}
            repost={original.repost_count}
            commentCount={item.comment_count}
            mineSamehere={item.mine_samehere}
            mineRepost={original.mine_repost}
            mineBookmark={item.mine_bookmark}
            hideComments={detail}
          />
        </div>
      </div>
    </article>
  );
}
