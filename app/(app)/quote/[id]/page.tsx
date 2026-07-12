import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import QuotedRepostCard from "@/components/feed/QuotedRepostCard";
import CommentComposer from "@/components/feed/CommentComposer";
import DeleteCommentButton from "@/components/feed/DeleteCommentButton";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import MentionText from "@/components/ui/MentionText";
import ProfileHoverLink from "@/components/profile/ProfileHoverLink";
import LocalTime from "@/components/ui/LocalTime";
import { IconChevronLeft, IconSame, IconRepost } from "@/components/icons";
import { fetchQuotedRepostById } from "@/lib/feed-quotes";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; is_founder: boolean; is_campus_founder: boolean; verified_student: boolean } | null;
};

// Logged-out render. Same pattern as app/(app)/post/[id]/page.tsx: plain anon
// supabase-js client, get_public_quote is SECURITY DEFINER + anon-granted and
// returns zero rows for missing/hidden/private-either-side quotes alike, so
// notFound() below can't distinguish them.
function anonSupabase() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// get_public_quote isn't in the generated Database types yet, same reason as
// get_public_post on the post page — cast once and take the rows ourselves.
function callRpc<T>(supabase: ReturnType<typeof anonSupabase>, fn: string, args: Record<string, unknown>) {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: T[] | null }>;
  return rpc(fn, args).then((r) => r.data ?? []);
}

type PublicQuote = {
  id: string;
  quote_text: string;
  created_at: string;
  reposter_id: string;
  reposter_username: string;
  reposter_display_name: string | null;
  reposter_avatar_url: string | null;
  reposter_is_pro: boolean;
  reposter_is_founder: boolean;
  reposter_is_campus_founder: boolean;
  reposter_verified_student: boolean;
  post_id: string;
  post_content: string;
  post_created_at: string;
  author_id: string;
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

async function PublicQuoteView({ id }: { id: string }) {
  const supabase = anonSupabase();
  const quote = (await callRpc<PublicQuote>(supabase, "get_public_quote", { p_id: id }))[0] ?? null;

  if (!quote) notFound();

  const rName = quote.reposter_display_name ?? quote.reposter_username;
  const aName = quote.author_display_name ?? quote.author_username;

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
          <ProfileHoverLink href={`/profile/${quote.reposter_username}`} username={quote.reposter_username} className="shrink-0">
            {quote.reposter_avatar_url ? (
              <AvatarImage
                src={quote.reposter_avatar_url}
                alt=""
                pro={quote.reposter_is_pro}
                className="h-10 w-10 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
                {rName.charAt(0).toUpperCase()}
              </div>
            )}
          </ProfileHoverLink>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <ProfileHoverLink
                href={`/profile/${quote.reposter_username}`}
                username={quote.reposter_username}
                className="font-semibold text-[var(--ink)] hover:underline"
              >
                {rName}
              </ProfileHoverLink>
              <UserBadges
                isPro={quote.reposter_is_pro}
                isFounder={quote.reposter_is_founder}
                isCampusFounder={quote.reposter_is_campus_founder}
                isVerifiedStudent={quote.reposter_verified_student}
              />
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
              <span>@{quote.reposter_username}</span>
              <span className="mx-1 text-[var(--ink-faint)]">·</span>
              <LocalTime iso={quote.created_at} variant="ago" />
            </p>
            <p className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-[16px] leading-[1.55] text-[var(--ink)]">
              <MentionText>{quote.quote_text}</MentionText>
            </p>

            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
              <div className="flex gap-3">
                <ProfileHoverLink href={`/profile/${quote.author_username}`} username={quote.author_username} className="shrink-0">
                  {quote.author_avatar_url ? (
                    <AvatarImage
                      src={quote.author_avatar_url}
                      alt=""
                      pro={quote.author_is_pro}
                      className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
                      {aName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </ProfileHoverLink>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--ink-muted)]">
                    <span className="font-medium text-[var(--ink)]">{aName}</span>{" "}
                    <ProfileHoverLink href={`/profile/${quote.author_username}`} username={quote.author_username} className="hover:underline">
                      @{quote.author_username}
                    </ProfileHoverLink>
                    <UserBadges
                      isPro={quote.author_is_pro}
                      isFounder={quote.author_is_founder}
                      isCampusFounder={quote.author_is_campus_founder}
                      isVerifiedStudent={quote.author_verified_student}
                    />
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-[1.55] text-[var(--ink)]">
                    <MentionText>{quote.post_content}</MentionText>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Read-only counts — anon can't react. No buttons, no handlers. */}
        <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <IconSame /> {quote.samehere_count}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconRepost /> {quote.repost_count}
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

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasAuthCookie())) return <PublicQuoteView id={id} />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <PublicQuoteView id={id} />;

  const [quote, { data: comments }] = await Promise.all([
    fetchQuotedRepostById(supabase, id, user?.id ?? null),
    supabase
      .from("comments")
      .select("id, content, created_at, user_id, author:profiles!comments_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student)")
      .eq("repost_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
  ]);

  if (!quote) notFound();

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
        <QuotedRepostCard item={quote} viewerId={viewerId} variant="detail" />
      </div>

      <section className="card mt-6 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">
          {comments && comments.length > 0 ? `${comments.length} comments` : "Comments"}
        </h2>

        <CommentComposer quoteId={id} />

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
                    {c.author && <UserBadges isPro={c.author.is_pro} isFounder={c.author.is_founder} isCampusFounder={c.author.is_campus_founder} isVerifiedStudent={c.author.verified_student} />}
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
