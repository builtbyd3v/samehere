import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import CommentComposer from "@/components/feed/CommentComposer";
import DeleteCommentButton from "@/components/feed/DeleteCommentButton";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import { IconChevronLeft } from "@/components/icons";
import { attachSignedMedia } from "@/lib/media";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; is_founder: boolean; is_campus_founder: boolean } | null;
};

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data }, { data: comments }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("comments")
      .select("id, content, created_at, user_id, author:profiles!comments_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
  ]);
  const raw = data as FeedPost | null;
  if (!raw) notFound();
  const [post] = await attachSignedMedia(supabase, [raw]);

  const viewerId = user?.id ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
      >
        <IconChevronLeft />
        Feed
      </Link>

      <div className="mt-4">
        <PostCard post={post} viewerId={viewerId} variant="detail" />
      </div>

      <section className="card mt-6 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">
          {comments && comments.length > 0 ? `${comments.length} comments` : "Comments"}
        </h2>

        <CommentComposer postId={post.id} />

        <div className="mt-6 space-y-5">
          {comments?.map((c) => {
            const cname = c.author?.display_name ?? c.author?.username ?? "Unknown";
            return (
              <div key={c.id} className="flex gap-3">
                {c.author ? (
                  <ProfileHoverLink
                    href={`/profile/${c.author.username}`}
                    username={c.author.username}
                    className="shrink-0"
                  >
                    {c.author.avatar_url ? (
                      <AvatarImage src={c.author.avatar_url} alt="" className="h-8 w-8 rounded-full border border-[var(--border)] object-cover" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                        {cname.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </ProfileHoverLink>
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                    {cname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                    {c.author ? (
                      <ProfileHoverLink
                        href={`/profile/${c.author.username}`}
                        username={c.author.username}
                        className="font-medium hover:underline"
                      >
                        {cname}
                      </ProfileHoverLink>
                    ) : (
                      <span className="font-medium">{cname}</span>
                    )}
                    {c.author && <UserBadges isPro={c.author.is_pro} isFounder={c.author.is_founder} isCampusFounder={c.author.is_campus_founder} />}
                    {c.author && <span className="text-[var(--ink-muted)]">@{c.author.username}</span>}
                    <div className="ml-auto">
                      <DeleteCommentButton commentId={c.id} canDelete={viewerId === c.user_id} />
                    </div>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-[1.55]">
                    <MentionText>{c.content}</MentionText>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
