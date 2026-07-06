"use client";

import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
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
  };
  original: FeedPost;
  reactions: { user_id: string; type: string }[];
  bookmarks: { user_id: string }[];
  comments: { count: number }[];
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
  const reactions = item.reactions ?? [];
  const original = item.original;
  const authorPrivate = !!original.author?.is_private;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5">
      <div className="flex gap-3">
        <ProfileHoverLink href={`/profile/${r.username}`} username={r.username} className="shrink-0">
          {r.avatar_url ? (
            <AvatarImage src={r.avatar_url} alt="" className="h-10 w-10 rounded-full border border-[var(--border)] object-cover" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </ProfileHoverLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5">
                <ProfileHoverLink href={`/profile/${r.username}`} username={r.username} className="font-semibold hover:underline">
                  {name}
                </ProfileHoverLink>
                <UserBadges isPro={r.is_pro} isFounder={r.is_founder} isCampusFounder={r.is_campus_founder} />
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
            like={reactions.filter((x) => x.type === "like").length}
            samehere={reactions.filter((x) => x.type === "samehere").length}
            repost={original.reposts?.length ?? 0}
            commentCount={item.comments?.[0]?.count ?? 0}
            mineLike={!!viewerId && reactions.some((x) => x.type === "like" && x.user_id === viewerId)}
            mineSamehere={!!viewerId && reactions.some((x) => x.type === "samehere" && x.user_id === viewerId)}
            mineRepost={!!viewerId && (original.reposts ?? []).some((x) => x.user_id === viewerId)}
            mineBookmark={!!viewerId && (item.bookmarks ?? []).some((x) => x.user_id === viewerId)}
            hideComments={detail}
          />
        </div>
      </div>
    </article>
  );
}
