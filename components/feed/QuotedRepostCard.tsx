"use client";

import AvatarImage from "@/components/ui/AvatarImage";
import MentionText from "@/components/ui/MentionText";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import UserBadges from "@/components/profile/UserBadges";

export type QuotedRepost = {
  id: string;
  quote_text: string;
  created_at: string;
  reposter: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_pro: boolean;
    is_founder: boolean;
  };
  original: FeedPost;
};

export default function QuotedRepostCard({
  item,
  viewerId,
}: {
  item: QuotedRepost;
  viewerId: string | null;
}) {
  const r = item.reposter;
  const name = r.display_name ?? r.username;

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
          <div className="flex flex-wrap items-center gap-x-1.5">
            <ProfileHoverLink href={`/profile/${r.username}`} username={r.username} className="font-semibold hover:underline">
              {name}
            </ProfileHoverLink>
            <UserBadges isPro={r.is_pro} isFounder={r.is_founder} />
            <span className="text-[13px] text-[var(--ink-muted)]">@{r.username}</span>
            <span className="text-[13px] text-[var(--ink-faint)]">· reposted</span>
          </div>
          <p className="mt-2 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55]">
            <MentionText>{item.quote_text}</MentionText>
          </p>
          <div className="mt-3">
            <PostCard post={item.original} viewerId={viewerId} variant="embedded" />
          </div>
        </div>
      </div>
    </article>
  );
}
