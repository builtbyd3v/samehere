import Link from "next/link";
import ReactionRow from "./ReactionRow";
import PostMediaGrid from "./PostMediaGrid";
import PostMenu from "./PostMenu";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import type { PostMedia } from "@/lib/media";

// Shared select for feed queries (page + Load more) so the shape stays in sync
// with FeedPost. Lives here, not in the "use server" actions file (which may
// only export async functions). reactions(user_id, type) is embedded so we can
// derive counts + the viewer's own state in one round-trip.
// ponytail: exposes every reactor's user_id to the client. Fine at v1 scale;
// swap for a counts RPC if reaction volume or privacy ever matters.
export const POST_SELECT =
  "id, content, created_at, user_id, media, author:profiles!posts_user_id_fkey(username, display_name, avatar_url, is_private, is_pro, is_founder, profile_school(school)), reactions(user_id, type), reposts(user_id), bookmarks(user_id), comments(count)";

export const PAGE = 20;

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media: PostMedia[];
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_private: boolean;
    is_pro: boolean;
    is_founder: boolean;
    profile_school: { school: string | null } | null;
  } | null;
  reactions: { user_id: string; type: string }[];
  reposts: { user_id: string }[];
  bookmarks: { user_id: string }[];
  comments: { count: number }[];
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({
  author,
  name,
  size = "md",
}: {
  author: NonNullable<FeedPost["author"]>;
  name: string;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const inner = author.avatar_url ? (
    <AvatarImage src={author.avatar_url} alt="" className={`${dim} rounded-full border border-[var(--border)] object-cover`} />
  ) : (
    <div
      className={`grid ${dim} place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <Link href={`/profile/${author.username}`} className="shrink-0 transition hover:opacity-85">
      {inner}
    </Link>
  );
}

export default function PostCard({
  post,
  viewerId,
  variant = "feed",
}: {
  post: FeedPost;
  viewerId: string | null;
  variant?: "feed" | "profile";
}) {
  const a = post.author;
  const name = a?.display_name ?? a?.username ?? "Unknown";
  const school = a?.profile_school?.school ?? null;
  const r = post.reactions ?? [];
  const onProfile = variant === "profile";

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5">
      {onProfile ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/post/${post.id}`}
              className="text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
            >
              {timeAgo(post.created_at)}
            </Link>
            {a && (
              <PostMenu postId={post.id} authorId={post.user_id} authorUsername={a.username} viewerId={viewerId} />
            )}
          </div>
          <Link
            href={`/post/${post.id}`}
            className="mt-2 block max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]"
          >
            {post.content}
          </Link>
        </div>
      ) : (
        <div className="flex gap-3 sm:gap-4">
          {a ? <Avatar author={a} name={name} /> : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {a ? (
                    <Link href={`/profile/${a.username}`} className="font-semibold text-[var(--ink)] hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  {a && <UserBadges isPro={a.is_pro} isFounder={a.is_founder} />}
                </div>
                <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
                  {a && <span>@{a.username}</span>}
                  {school && a && <span className="mx-1 text-[var(--ink-faint)]">·</span>}
                  {school && <span>{school}</span>}
                  {(a || school) && <span className="mx-1 text-[var(--ink-faint)]">·</span>}
                  <Link href={`/post/${post.id}`} className="hover:text-[var(--ink)] hover:underline">
                    {timeAgo(post.created_at)}
                  </Link>
                </p>
              </div>

              {a && (
                <PostMenu postId={post.id} authorId={post.user_id} authorUsername={a.username} viewerId={viewerId} />
              )}
            </div>

            <Link
              href={`/post/${post.id}`}
              className="mt-3 block max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]"
            >
              {post.content}
            </Link>
          </div>
        </div>
      )}

      {post.media?.length ? <PostMediaGrid media={post.media} compact={onProfile} /> : null}

      <ReactionRow
        postId={post.id}
        viewerId={viewerId}
        authorPrivate={!!a?.is_private}
        like={r.filter((x) => x.type === "like").length}
        samehere={r.filter((x) => x.type === "samehere").length}
        repost={post.reposts?.length ?? 0}
        commentCount={post.comments?.[0]?.count ?? 0}
        mineLike={!!viewerId && r.some((x) => x.type === "like" && x.user_id === viewerId)}
        mineSamehere={!!viewerId && r.some((x) => x.type === "samehere" && x.user_id === viewerId)}
        mineRepost={!!viewerId && (post.reposts ?? []).some((x) => x.user_id === viewerId)}
        mineBookmark={(post.bookmarks ?? []).length > 0}
        compact={onProfile}
      />
    </article>
  );
}
