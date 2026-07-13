import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import PostCard, { POST_SELECT, withEngagement, type PostRow } from "@/components/feed/PostCard";
import CommentThread from "@/components/feed/CommentThread";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import LocalTime from "@/components/ui/LocalTime";
import { IconChevronLeft, IconSame, IconRepost } from "@/components/icons";
import { attachSignedMedia } from "@/lib/media";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { getViewerProfile } from "@/lib/viewer";
import type { Comment, CommentAuthor } from "@/components/feed/comment-types";

// noindex/nofollow, not disabled — link-preview crawlers (Twitterbot, Slackbot,
// etc.) fetch and parse <head> directly, bypassing robots, so unfurls still
// work; this only keeps posts out of search indexes. Flipping it on later is a
// one-line change.
// Runs with no session (crawlers, logged-out visitors), so it reads the same
// anon-granted definer the page body uses. get_public_post returns zero rows for
// a missing id, a hidden post, AND a private author's post alike — so all three
// unfurl identically and the metadata can't be used as an oracle to confirm
// which uuids are real posts by private students.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rows = await callRpc<PublicPost>(anonSupabase(), "get_public_post", { p_id: id });
  const post = rows[0] ?? null;

  // noindex, but crawlers still parse <head>, so unfurls work. See the profile page.
  const robots = { index: false, follow: false };
  if (!post) return { title: "Post not found", robots };

  const name = post.author_display_name ?? post.author_username;
  const description = post.content.length > 160 ? `${post.content.slice(0, 157)}...` : post.content;

  // The tab title goes through the root `template: "%s · samehere"`, so it must
  // NOT say "samehere" itself. og:/twitter: titles have no template and do.
  const tabTitle = `${name} (@${post.author_username})`;
  const shareTitle = `${tabTitle} on samehere`;

  // No `images`: the root opengraph-image route supplies the card. An explicit
  // images entry here would override it.
  return {
    title: tabTitle,
    description,
    robots,
    openGraph: { title: shareTitle, description, type: "article", publishedTime: post.created_at },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
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
  author_verified_student: boolean;
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
              <UserBadges isPro={post.author_is_pro} isFounder={post.author_is_founder} isCampusFounder={post.author_is_campus_founder} isVerifiedStudent={post.author_verified_student} />
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

// Anon crawler unfurls and logged-out visits are the common case for this
// route; skip constructing the cookie-bound Supabase client entirely when no
// Supabase auth cookie is present at all. See plans/006-request-layer-dedup.md
// for the same predicate used in lib/supabase/middleware.ts.
async function hasAuthCookie() {
  const store = await cookies();
  return store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasAuthCookie())) return <PublicPostView id={id} />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <PublicPostView id={id} />;

  const [{ data }, { data: comments }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("comments")
      .select("id, content, created_at, user_id, author:profiles!comments_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
  ]);
  const raw = data as PostRow | null;
  if (!raw) notFound();
  const [signed] = await attachSignedMedia(supabase, [raw]);
  const viewerId = user?.id ?? null;
  const mine = await fetchViewerMineState(supabase, viewerId, [signed.id], []);
  const [post] = withEngagement([signed], mine);

  // Own profile, for the optimistic comment row's avatar/name/badges (the
  // real row won't have these until the server round-trip resolves).
  // request-scoped cache() in lib/viewer.ts — free if layout.tsx already
  // fetched it this render.
  const vp = await getViewerProfile();
  const viewerAuthor: CommentAuthor | null = vp
    ? {
        username: vp.username,
        display_name: vp.display_name,
        avatar_url: vp.avatar_url,
        is_pro: vp.is_pro ?? false,
        is_founder: vp.is_founder ?? false,
        is_campus_founder: vp.is_campus_founder ?? false,
        verified_student: vp.verified_student ?? false,
      }
    : null;

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
        <CommentThread
          postId={post.id}
          initialComments={comments ?? []}
          viewerId={viewerId}
          viewer={viewerAuthor}
        />
      </section>
    </main>
  );
}
