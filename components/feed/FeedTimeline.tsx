import FeedStagger from "@/components/feed/FeedStagger";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import QuotedRepostCard, { type QuotedRepost } from "@/components/feed/QuotedRepostCard";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import { Repeat2 } from "lucide-react";
import type { PlainRepost } from "@/lib/feed-reposts";
import type { FeedTimelineItem } from "@/lib/feed-timeline";

export default function FeedTimeline({
  items,
  viewerId,
}: {
  items: FeedTimelineItem[];
  viewerId: string | null;
}) {
  return (
    <FeedStagger>
      {items.map((item) => {
        if (item.kind === "post") {
          return <PostCard key={`post-${item.post.id}`} post={item.post} viewerId={viewerId} />;
        }
        if (item.kind === "quote") {
          return <QuotedRepostCard key={`quote-${item.quote.id}`} item={item.quote} viewerId={viewerId} />;
        }
        const reposter = item.repost.reposter;
        const name = reposter.display_name ?? reposter.username;
        return (
          <div key={`repost-${item.repost.id}`}>
            <ProfileHoverLink
              href={`/profile/${reposter.username}`}
              username={reposter.username}
              className="flex items-center gap-1.5 pl-[46px] pt-3 text-xs text-[var(--muted)] hover:text-[var(--ink)] lg:pl-[50px]"
            >
              <Repeat2 size={13} strokeWidth={1.7} aria-hidden />
              <span>{name} reposted</span>
            </ProfileHoverLink>
            <PostCard post={item.repost.original} viewerId={viewerId} />
          </div>
        );
      })}
    </FeedStagger>
  );
}

export type { FeedTimelineItem, FeedPost, QuotedRepost, PlainRepost };
