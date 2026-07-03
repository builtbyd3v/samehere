import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import ReactionRow from "@/components/feed/ReactionRow";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    // RLS returns the row only if the viewer may see it; anything else -> 404.
    supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
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

        <p className="mt-5 whitespace-pre-line text-[17px] leading-relaxed text-[var(--ink)]">
          {post.content}
        </p>

        <ReactionRow
          postId={post.id}
          viewerId={viewerId}
          like={r.filter((x) => x.type === "like").length}
          samehere={r.filter((x) => x.type === "samehere").length}
          mineLike={!!viewerId && r.some((x) => x.type === "like" && x.user_id === viewerId)}
          mineSamehere={!!viewerId && r.some((x) => x.type === "samehere" && x.user_id === viewerId)}
        />
        {/* TODO(Phase 6): repost + bookmark */}
      </article>

      {/* TODO(Phase 6): comment composer (50-char min) + comment thread */}
      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <p className="text-sm text-[var(--ink-muted)]">Comments coming in this build.</p>
      </section>
    </main>
  );
}
