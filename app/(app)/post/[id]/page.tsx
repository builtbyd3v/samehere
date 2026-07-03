import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import ReactionRow from "@/components/feed/ReactionRow";
import CommentComposer from "@/components/feed/CommentComposer";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data }, { data: comments }] = await Promise.all([
    supabase.auth.getUser(),
    // RLS returns the row only if the viewer may see it; anything else -> 404.
    supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    // Comments RLS mirrors post visibility, so this is empty if the post is hidden.
    supabase
      .from("comments")
      .select("id, content, created_at, author:profiles!comments_user_id_fkey(username, display_name, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
  ]);
  const post = data as FeedPost | null;
  if (!post) notFound();

  const viewerId = user?.id ?? null;
  const r = post.reactions ?? [];
  const a = post.author;
  const name = a?.display_name ?? a?.username ?? "Unknown";
  const school = a?.profile_school?.school ?? null;
  const when = new Date(post.created_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/feed" className="text-sm text-[var(--ink-muted)] hover:underline">
        ← Feed
      </Link>

      <article className="mt-5">
        <div className="flex items-center gap-3">
          {a?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] object-cover" />
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] font-semibold text-[var(--ink-muted)]">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {a ? (
              <Link href={`/profile/${a.username}`} className="font-medium hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )}
            {a && <span className="ml-1.5 text-sm text-[var(--ink-muted)]">@{a.username}</span>}
            <p className="text-sm text-[var(--ink-muted)]">{school ? `${school} · ` : ""}{when}</p>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line break-words text-[17px] leading-relaxed text-[var(--ink)]">
          {post.content}
        </p>

        <ReactionRow
          postId={post.id}
          viewerId={viewerId}
          authorPrivate={!!a?.is_private}
          like={r.filter((x) => x.type === "like").length}
          samehere={r.filter((x) => x.type === "samehere").length}
          repost={post.reposts?.length ?? 0}
          commentCount={comments?.length ?? 0}
          mineLike={!!viewerId && r.some((x) => x.type === "like" && x.user_id === viewerId)}
          mineSamehere={!!viewerId && r.some((x) => x.type === "samehere" && x.user_id === viewerId)}
          mineRepost={!!viewerId && (post.reposts ?? []).some((x) => x.user_id === viewerId)}
          mineBookmark={(post.bookmarks ?? []).length > 0}
        />
      </article>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 className="mb-4 text-sm font-medium">
          {comments && comments.length > 0 ? `${comments.length} comments` : "Comments"}
        </h2>

        <CommentComposer postId={post.id} />

        <div className="mt-6 space-y-5">
          {comments?.map((c) => {
            const cname = c.author?.display_name ?? c.author?.username ?? "Unknown";
            return (
              <div key={c.id} className="flex gap-3">
                {c.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.author.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] object-cover" />
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink-muted)]">
                    {cname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm">
                    {c.author ? (
                      <Link href={`/profile/${c.author.username}`} className="font-medium hover:underline">{cname}</Link>
                    ) : (
                      <span className="font-medium">{cname}</span>
                    )}
                    {c.author && <span className="ml-1.5 text-[var(--ink-muted)]">@{c.author.username}</span>}
                  </div>
                  <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-relaxed">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
