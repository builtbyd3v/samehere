import Link from "next/link";
import ReactionRow from "./ReactionRow";
import PostMediaGrid from "./PostMediaGrid";
import PostMenu from "./PostMenu";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import PostBodyLink from "./PostBodyLink";
import LocalTime from "@/components/ui/LocalTime";
import type { PostMedia } from "@/lib/media";
import type { ViewerMineState } from "@/lib/feed-engagement";

export const POST_SELECT =
  "id, content, created_at, user_id, media, author:profiles!posts_user_id_fkey(username, display_name, avatar_url, is_private, is_pro, is_founder, is_campus_founder, verified_student, profile_school(school)), reactions(count), reposts(count), comments(count)";

export const PAGE = 20;

type Author = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  profile_school: { school: string | null } | null;
} | null;

// Raw shape straight off `.select(POST_SELECT)`: media not yet signed
// (see lib/media.ts's attachSignedMedia), engagement not yet resolved to
// this viewer's mine-flags (see lib/feed-engagement.ts's withEngagement).
export type PostRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media: PostMedia[];
  author: Author;
  reactions: { count: number }[];
  reposts: { count: number }[];
  comments: { count: number }[];
};

// Final shape every rendering component consumes: media signed, engagement
// flattened to public counts + this viewer's private mine-flags. Produced
// by withEngagement() below, called AFTER attachSignedMedia.
export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media: PostMedia[];
  author: Author;
  samehere_count: number;
  repost_count: number;
  comment_count: number;
  mine_samehere: boolean;
  mine_repost: boolean;
  mine_bookmark: boolean;
};

export function withEngagement(rows: PostRow[], mine: ViewerMineState): FeedPost[] {
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    user_id: r.user_id,
    media: r.media,
    author: r.author,
    samehere_count: r.reactions?.[0]?.count ?? 0,
    repost_count: r.reposts?.[0]?.count ?? 0,
    comment_count: r.comments?.[0]?.count ?? 0,
    mine_samehere: mine.samehere.has(r.id),
    mine_repost: mine.repost.has(r.id),
    mine_bookmark: mine.bookmark.has(r.id),
  }));
}

function Avatar({
  author,
  name,
  size = "md",
}: {
  author: NonNullable<FeedPost["author"]>;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const inner = (
    <AvatarBase
      src={author.avatar_url}
      seed={author.username}
      name={name}
      className={`${dim} rounded-full border border-[var(--border)] text-sm`}
      pro={author.is_pro}
    />
  );

  if (size === "sm") return <div className="shrink-0">{inner}</div>;

  return (
    <ProfileHoverLink href={`/profile/${author.username}`} username={author.username} className="shrink-0 transition hover:opacity-85">
      {inner}
    </ProfileHoverLink>
  );
}

function PostBody({ content, linked, postId }: { content: string; linked: boolean; postId: string }) {
  const inner = (
    <span className={`max-w-[65ch] whitespace-pre-line break-words text-[16.5px] leading-[1.5] text-[var(--ink)] ${linked ? "" : "block"}`}>
      <MentionText>{content}</MentionText>
    </span>
  );
  if (linked) {
    return <PostBodyLink postId={postId}>{inner}</PostBodyLink>;
  }
  return <div className="mt-2.5">{inner}</div>;
}

export default function PostCard({
  post,
  viewerId,
  variant = "feed",
  embeddedLinked = false,
}: {
  post: FeedPost;
  viewerId: string | null;
  variant?: "feed" | "profile" | "detail" | "embedded";
  embeddedLinked?: boolean;
}) {
  const a = post.author;
  const name = a?.display_name ?? a?.username ?? "Unknown";
  const school = a?.profile_school?.school ?? null;
  const embedded = variant === "embedded";
  const detail = variant === "detail";
  const linked = !embedded && !detail;

  const shell = embedded
    ? "rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
    : `rounded-2xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5${
        detail ? "" : " transition-colors duration-200 hover:border-[var(--border-strong)]"
      }`;

  const body = (
    <article className={shell}>
      <div className={`flex gap-3 ${embedded ? "" : "sm:gap-4"}`}>
        {a ? <Avatar author={a} name={name} size={embedded ? "sm" : "md"} /> : null}

        <div className="min-w-0 flex-1">
          {!embedded && (
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {a ? (
                    <ProfileHoverLink
                      href={`/profile/${a.username}`}
                      username={a.username}
                      className="font-semibold text-[var(--ink)] hover:underline"
                    >
                      {name}
                    </ProfileHoverLink>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  {a && <UserBadges isPro={a.is_pro} isFounder={a.is_founder} isCampusFounder={a.is_campus_founder} isVerifiedStudent={a.verified_student} />}
                </div>
                <p className="mt-0.5 text-[12.5px] text-[var(--ink-faint)]">
                  {a && <span>@{a.username}</span>}
                  {school && <span>{a ? ", " : ""}{school}</span>}
                  {(a || school) && <span className="mx-1 text-[var(--ink-faint)]">·</span>}
                  {linked ? (
                    <Link href={`/post/${post.id}`} className="hover:text-[var(--ink-muted)] hover:underline">
                      <LocalTime iso={post.created_at} variant="ago" />
                    </Link>
                  ) : (
                    <LocalTime iso={post.created_at} variant="ago" />
                  )}
                </p>
              </div>

              {a && !embedded && (
                <PostMenu postId={post.id} authorId={post.user_id} authorUsername={a.username} viewerId={viewerId} />
              )}
            </div>
          )}

          {embedded && a && (
            <p className="mb-2 text-[13px] text-[var(--ink-muted)]">
              <span className="font-medium text-[var(--ink)]">{name}</span>
              <span className="mx-1">@{a.username}</span>
            </p>
          )}

          <PostBody content={post.content} linked={linked} postId={post.id} />
        </div>
      </div>

      {post.media?.length ? <PostMediaGrid media={post.media} compact={embedded} /> : null}

      {!embedded && (
        <ReactionRow
          postId={post.id}
          post={post}
          viewerId={viewerId}
          authorPrivate={!!a?.is_private}
          samehere={post.samehere_count}
          repost={post.repost_count}
          commentCount={post.comment_count}
          mineSamehere={post.mine_samehere}
          mineRepost={post.mine_repost}
          mineBookmark={post.mine_bookmark}
          hideComments={detail}
        />
      )}
    </article>
  );

  if (embedded && embeddedLinked) {
    return (
      <PostBodyLink postId={post.id} className="block cursor-pointer transition-transform duration-150 hover:opacity-95 active:translate-y-[1px]">
        {body}
      </PostBodyLink>
    );
  }

  return body;
}
