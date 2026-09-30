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
import type { ContextLabel, TeamEventMode } from "@/types/portfolio";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatTeamEventLine, parseTeamEventMode } from "@/lib/team-event";
import { feedPath, stuckReplyPath } from "@/lib/feed-label";
import { CONTEXT_LABEL_COPY, CONTEXT_LABEL_DOT } from "@/lib/context-label";
import { authorMetaLine, splitQuestion } from "@/lib/feed-view";

export const POST_SELECT =
  "id, content, created_at, user_id, media, hidden, context_label, team_event_name, team_event_date, team_event_mode, resolved_at, resolved_comment_id, author:profiles!posts_user_id_fkey(username, display_name, avatar_url, is_private, is_pro, is_founder, is_campus_founder, verified_student, is_bot, stage, profile_school(school)), reactions(count), reposts(count), comments!comments_post_id_fkey(count)";

// Same columns with the author embed as an inner join, so `.eq("author.<col>", v)`
// filters posts instead of nulling the embed (used by the Your stage tab).
export const POST_SELECT_AUTHOR_INNER = POST_SELECT.replace(
  "author:profiles!posts_user_id_fkey(",
  "author:profiles!posts_user_id_fkey!inner(",
);

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
  is_bot: boolean;
  stage: string | null;
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
  hidden: boolean;
  context_label: ContextLabel | null;
  team_event_name: string | null;
  team_event_date: string | null;
  team_event_mode: string | null;
  resolved_at: string | null;
  resolved_comment_id: string | null;
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
  hidden: boolean;
  context_label: ContextLabel | null;
  team_event_name: string | null;
  team_event_date: string | null;
  team_event_mode: TeamEventMode | null;
  resolved_at: string | null;
  resolved_comment_id: string | null;
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
    hidden: r.hidden,
    context_label: r.context_label ?? null,
    team_event_name: r.team_event_name ?? null,
    team_event_date: r.team_event_date ?? null,
    team_event_mode: parseTeamEventMode(r.team_event_mode),
    resolved_at: r.resolved_at ?? null,
    resolved_comment_id: r.resolved_comment_id ?? null,
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
  embedded,
}: {
  author: NonNullable<FeedPost["author"]>;
  name: string;
  embedded: boolean;
}) {
  const inner = (
    <AvatarBase
      src={author.avatar_url}
      seed={author.username}
      name={name}
      className={`${embedded ? "h-8 w-8" : "size-[34px] lg:size-9"} rounded-full text-xs`}
      pro={author.is_pro}
    />
  );

  if (embedded) return <div className="shrink-0">{inner}</div>;

  return (
    <ProfileHoverLink href={`/profile/${author.username}`} username={author.username} className="shrink-0 hover:opacity-85">
      {inner}
    </ProfileHoverLink>
  );
}

function PostBody({ content, linked, postId }: { content: string; linked: boolean; postId: string }) {
  const inner = (
    <p className="whitespace-pre-line break-words text-[15px] leading-[1.55] text-[var(--ink-2)] lg:leading-[1.6]">
      <MentionText>{content}</MentionText>
    </p>
  );
  if (linked) {
    return (
      <PostBodyLink postId={postId} className="block cursor-pointer">
        {inner}
      </PostBodyLink>
    );
  }
  return inner;
}

function StuckQuestion({
  content,
  postId,
  linked,
  solved = false,
}: {
  content: string;
  postId: string;
  linked: boolean;
  solved?: boolean;
}) {
  const { question, detail } = splitQuestion(content);
  const block = (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--amber)]/22 bg-[var(--amber)]/5 p-3 lg:gap-2 lg:rounded-[14px] lg:bg-transparent lg:bg-linear-to-b lg:from-[var(--amber)]/6 lg:to-[var(--amber)]/[0.015] lg:p-4">
      <span className={`flex items-center gap-2 text-xs ${solved ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
        {solved ? <CircleCheck size={14} strokeWidth={2} aria-hidden /> : <CircleAlert size={14} strokeWidth={2} aria-hidden />}
        {solved ? "Stuck · solved" : "Stuck · open"}
      </span>
      <p className="break-words text-[15px] font-medium leading-[1.4] text-[var(--ink)] lg:text-base lg:leading-[1.45]">
        <MentionText>{question}</MentionText>
      </p>
      {detail ? (
        <p className="whitespace-pre-line break-words text-sm leading-[1.55] text-[var(--muted)]">
          <MentionText>{detail}</MentionText>
        </p>
      ) : null}
    </div>
  );
  return linked ? (
    <PostBodyLink postId={postId} className="block cursor-pointer">
      {block}
    </PostBodyLink>
  ) : (
    block
  );
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
  const embedded = variant === "embedded";
  const detail = variant === "detail";
  const linked = !embedded && !detail;
  const label = post.context_label;
  const meta = authorMetaLine(a);
  const teamLine =
    label === "looking_for_team" && !embedded
      ? formatTeamEventLine({
          team_event_name: post.team_event_name,
          team_event_date: post.team_event_date,
          team_event_mode: post.team_event_mode,
        })
      : null;

  const cta =
    embedded ? null : label === "stuck" && !detail ? (
      <Button variant="outline" size="sm" href={stuckReplyPath(post.id)}>
        Answer
      </Button>
    ) : label === "looking_for_team" && viewerId && a?.username && viewerId !== post.user_id ? (
      <Button variant="outline" size="sm" href={`/messages?to=${encodeURIComponent(a.username)}`}>
        I&apos;m in
      </Button>
    ) : null;

  const shell = embedded
    ? "flex gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] p-3"
    : `flex gap-3 border-b border-[var(--hairline)] py-4 transition-colors duration-[180ms] lg:gap-3.5 lg:py-[22px]${detail ? "" : " hover:bg-white/[0.015]"}`;

  const body = (
    <article className={shell}>
      {a ? <Avatar author={a} name={name} embedded={embedded} /> : null}

      <div className={`flex min-w-0 flex-1 flex-col ${embedded ? "gap-1.5" : "gap-2 lg:gap-2.5"}`}>
        {embedded ? (
          a ? (
            <p className="text-[13px] text-[var(--muted)]">
              <span className="font-medium text-[var(--ink)]">{name}</span>
              <span className="mx-1">@{a.username}</span>
            </p>
          ) : null
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            {a ? (
              // Wrapper is the flex item: ProfileHoverLink's own inline span cannot shrink.
              <span className="min-w-0 truncate">
                <ProfileHoverLink
                  href={`/profile/${a.username}`}
                  username={a.username}
                  className="text-[15px] font-semibold text-[var(--ink)] hover:underline"
                >
                  {name}
                </ProfileHoverLink>
              </span>
            ) : (
              <span className="min-w-0 truncate text-[15px] font-semibold">{name}</span>
            )}
            {a && (
              <UserBadges
                isPro={a.is_pro}
                isFounder={a.is_founder}
                isCampusFounder={a.is_campus_founder}
                isVerifiedStudent={a.verified_student}
                isBot={a.is_bot}
              />
            )}
            {meta ? <span className="hidden min-w-0 truncate text-sm text-[var(--faint)] sm:inline">{meta}</span> : null}
            {post.hidden && (
              <span className="inline-flex shrink-0 rounded-full bg-[var(--danger)]/[0.06] px-2 py-0.5 text-xs font-medium text-[var(--danger)]">
                Hidden
              </span>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-3">
              {label && label !== "stuck" ? (
                <Link
                  href={feedPath({ label })}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <span aria-hidden className={`size-1.5 rounded-full ${CONTEXT_LABEL_DOT[label]}`} />
                  {CONTEXT_LABEL_COPY[label]}
                </Link>
              ) : null}
              {linked ? (
                <Link href={`/post/${post.id}`} className="text-[13px] text-[var(--faint)] hover:text-[var(--muted)]">
                  <LocalTime iso={post.created_at} variant="ago" />
                </Link>
              ) : (
                <LocalTime iso={post.created_at} variant="ago" className="text-[13px] text-[var(--faint)]" />
              )}
              {a && <PostMenu postId={post.id} authorId={post.user_id} authorUsername={a.username} viewerId={viewerId} />}
            </div>
          </div>
        )}

        {label === "stuck" && !embedded ? (
          <StuckQuestion content={post.content} postId={post.id} linked={linked} solved={Boolean(post.resolved_at)} />
        ) : (
          <PostBody content={post.content} linked={linked} postId={post.id} />
        )}
        {teamLine ? <p className="text-[13px] text-[var(--muted)]">{teamLine}</p> : null}

        {post.media?.length ? <PostMediaGrid media={post.media} /> : null}

        {!embedded && (
          <ReactionRow
            postId={post.id}
            viewerId={viewerId}
            authorPrivate={!!a?.is_private}
            samehere={post.samehere_count}
            repost={post.repost_count}
            commentCount={post.comment_count}
            mineSamehere={post.mine_samehere}
            mineRepost={post.mine_repost}
            mineBookmark={post.mine_bookmark}
            hideComments={detail}
            answers={label === "stuck"}
            cta={cta}
          />
        )}
      </div>
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
