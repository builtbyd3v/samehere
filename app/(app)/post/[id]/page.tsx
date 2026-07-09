import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import CommentComposer from "@/components/feed/CommentComposer";
import DeleteCommentButton from "@/components/feed/DeleteCommentButton";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import LocalTime from "@/components/ui/LocalTime";
import { IconChevronLeft, IconHeart, IconSame, IconRepost } from "@/components/icons";
import { attachSignedMedia } from "@/lib/media";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; is_founder: boolean; is_campus_founder: boolean } | null;
};

// noindex/nofollow, not disabled — link-preview crawlers (Twitterbot, Slackbot,
// etc.) fetch and parse <head> directly, bypassing robots, so unfurls still
// work; this only keeps posts out of search indexes. Flipping it on later is a
// one-line change.
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

// Logged-out render. Plain anon supabase-js client (not the cookie-bound session
// client) — same pattern as lib/founder.ts. get_public_post is SECURITY DEFINER
// + anon-granted and returns zero rows for missing, hidden, AND private-author
// posts alike, so the notFound() below can't distinguish them.
function anonSupabase() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// get_public_post is anon-granted SECURITY DEFINER but isn't in the generated
// Database types yet (types/database.types.ts hasn't been regenerated since
// the migration landed). A plain (untyped) client can't chain
// `.rpc().returns().maybeSingle()` with useful inference either way, so cast
// once and take the row ourselves.
function callRpc<T>(supabase: ReturnType<typeof anonSupabase>, fn: string, args: Record<string, unknown>) {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: T[] | null }>;
  return rpc(fn, args).then((r) => r.data ?? []);
}

type PublicPost = {
  id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_is_pro: boolean;
  author_is_founder: boolean;
  author_is_campus_founder: boolean;
  like_count: number;
  samehere_count: number;
  repost_count: number;
};

async function PublicPostView({ id }: { id: string }) {
  const supabase = anonSupabase();
  const post = (await callRpc<PublicPost>(supabase, "get_public_post", { p_id: id }))[0] ?? null;

  if (!post) notFound();

  const name = post.author_display_name ?? post.author_username;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
      >
        <IconChevronLeft />
        Feed
      </Link>

      <article className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <ProfileHoverLink href={`/profile/${post.author_username}`} username={post.author_username} className="shrink-0">
            {post.author_avatar_url ? (
              <AvatarImage
                src={post.author_avatar_url}
                alt=""
                pro={post.author_is_pro}
                className="h-10 w-10 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </ProfileHoverLink>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <ProfileHoverLink
                href={`/profile/${post.author_username}`}
                username={post.author_username}
                className="font-semibold text-[var(--ink)] hover:underline"
              >
                {name}
              </ProfileHoverLink>
              <UserBadges isPro={post.author_is_pro} isFounder={post.author_is_founder} isCampusFounder={post.author_is_campus_founder} />
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
              <span>@{post.author_username}</span>
              <span className="mx-1 text-[var(--ink-faint)]">·</span>
              <LocalTime iso={post.created_at} variant="ago" />
            </p>
            <p className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]">
              <MentionText>{post.content}</MentionText>
            </p>
          </div>
        </div>

        {/* Read-only counts — anon can't react. No buttons, no handlers. */}
        <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <IconHeart /> {post.like_count}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconSame /> {post.samehere_count}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconRepost /> {post.repost_count}
          </span>
        </div>
      </article>

      <div className="card mt-6 px-6 py-10 text-center">
        <p className="font-medium text-[var(--ink)]">Sign in to reply</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/login" className="btn-ghost !rounded-full !px-4 !py-1.5 text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary !rounded-full !px-4 !py-1.5 text-sm">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <PublicPostView id={id} />;

  const [{ data }, { data: comments }] = await Promise.all([
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
                      <AvatarImage src={c.author.avatar_url} alt="" className="h-8 w-8 rounded-full border border-[var(--border)] object-cover" pro={c.author.is_pro ?? false} />
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
