import Link from "next/link";
import ReactionRow from "./ReactionRow";

// Shared select for feed queries (page + Load more) so the shape stays in sync
// with FeedPost. Lives here, not in the "use server" actions file (which may
// only export async functions). reactions(user_id, type) is embedded so we can
// derive counts + the viewer's own state in one round-trip.
// ponytail: exposes every reactor's user_id to the client. Fine at v1 scale;
// swap for a counts RPC if reaction volume or privacy ever matters.
export const POST_SELECT =
  "id, content, created_at, user_id, author:profiles!posts_user_id_fkey(username, display_name, avatar_url, profile_school(school)), reactions(user_id, type)";

export const PAGE = 20;

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    profile_school: { school: string | null } | null;
  } | null;
  reactions: { user_id: string; type: string }[];
};

// Compact relative time: 34s, 12m, 5h, 3d, then a date.
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

export default function PostCard({ post, viewerId }: { post: FeedPost; viewerId: string | null }) {
  const a = post.author;
  const name = a?.display_name ?? a?.username ?? "Unknown";
  const school = a?.profile_school?.school ?? null;
  const r = post.reactions ?? [];

  return (
    <article className="border-b border-[var(--border)] px-1 py-5">
      <div className="flex items-center gap-2.5">
        {a?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover" />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-x-1.5">
            {a ? (
              <Link href={`/profile/${a.username}`} className="font-medium hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )}
            {a && <span className="text-[var(--ink-muted)]">@{a.username}</span>}
          </div>
          <p className="text-[var(--ink-muted)]">
            {school ? `${school} · ` : ""}
            <Link href={`/post/${post.id}`} className="hover:underline">{timeAgo(post.created_at)}</Link>
          </p>
        </div>
      </div>

      <Link href={`/post/${post.id}`} className="mt-3 block whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink)]">
        {post.content}
      </Link>

      <ReactionRow
        postId={post.id}
        viewerId={viewerId}
        like={r.filter((x) => x.type === "like").length}
        samehere={r.filter((x) => x.type === "samehere").length}
        mineLike={!!viewerId && r.some((x) => x.type === "like" && x.user_id === viewerId)}
        mineSamehere={!!viewerId && r.some((x) => x.type === "samehere" && x.user_id === viewerId)}
      />
      {/* TODO(Phase 6): repost + bookmark + comment count */}
    </article>
  );
}
