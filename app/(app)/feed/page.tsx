import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import FollowButton from "@/components/profile/FollowButton";
import { attachSignedMedia } from "@/lib/media";

// Twitter-style feed: Latest (global recency) and Following (followed users'
// posts + follow requests + suggested users — formerly the dashboard). Only
// the active tab's data is fetched.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab = (await searchParams).tab === "following" ? "following" : "latest";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Feed</h1>

      <PostComposer />

      <div className="mt-6 flex gap-5 border-b border-[var(--border)] text-sm">
        <Link
          href="/feed"
          className={
            tab === "latest"
              ? "-mb-px border-b-2 border-[var(--ink)] pb-2 px-1 font-medium text-[var(--ink)]"
              : "-mb-px border-b-2 border-transparent pb-2 px-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }
        >
          Latest
        </Link>
        <Link
          href="/feed?tab=following"
          className={
            tab === "following"
              ? "-mb-px border-b-2 border-[var(--ink)] pb-2 px-1 font-medium text-[var(--ink)]"
              : "-mb-px border-b-2 border-transparent pb-2 px-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }
        >
          Following
        </Link>
      </div>

      {tab === "latest" ? (
        <LatestTab viewerId={viewerId} />
      ) : (
        <FollowingTab userId={user?.id ?? null} viewerId={viewerId} />
      )}
    </main>
  );
}

// ponytail: Latest = global recency; becomes a personalized "For You" once Phase 12 AI ranking lands.
async function LatestTab({ viewerId }: { viewerId: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE)
    .returns<FeedPost[]>();
  const posts = data ? await attachSignedMedia(supabase, data) : null;

  return (
    <section className="mt-6">
      {!posts || posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
          No posts yet. Be the first to share something.
        </p>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
          <FeedLoadMore
            cursor={posts[posts.length - 1].created_at}
            hasMore={posts.length === PAGE}
            viewerId={viewerId}
          />
        </>
      )}
    </section>
  );
}

async function FollowingTab({ userId, viewerId }: { userId: string | null; viewerId: string | null }) {
  // proxy already gates this route; userId is only null for a type-narrowing edge case.
  if (!userId) return null;

  const supabase = await createClient();

  const [{ data: requests }, { data: myFollows }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id, requester:profiles!follows_follower_id_fkey(username, display_name, avatar_url)")
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<FollowRequest[]>(),
    supabase.from("follows").select("following_id, status").eq("follower_id", userId),
  ]);

  const acceptedIds = (myFollows ?? []).filter((f) => f.status === "accepted").map((f) => f.following_id);
  const excludeIds = [userId, ...(myFollows ?? []).map((f) => f.following_id)]; // never empty (has me)

  // ponytail: Following feed is first-page only; add cursor load-more if it grows.
  // ponytail: followed users' own posts only; reposts-in-feed deferred.
  const [{ data: followFeed }, { data: suggested }] = await Promise.all([
    acceptedIds.length
      ? supabase
          .from("posts")
          .select(POST_SELECT)
          .in("user_id", acceptedIds)
          .order("created_at", { ascending: false })
          .limit(PAGE)
          .returns<FeedPost[]>()
      : Promise.resolve({ data: [] as FeedPost[] }),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const feedPosts = followFeed ? await attachSignedMedia(supabase, followFeed) : null;

  return (
    <section className="mt-6">
      {requests && requests.length > 0 && <FollowRequests requests={requests} />}

      {suggested && suggested.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium">People to follow</h2>
          <div className="space-y-2">
            {suggested.map((s) => {
              const name = s.display_name ?? s.username;
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                  {s.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/profile/${s.username}`} className="font-medium hover:underline">
                      {name}
                    </Link>
                    <span className="ml-1.5 text-[var(--ink-muted)]">@{s.username}</span>
                    {/* TODO(Phase 12): AI connection prompt — one sentence on why to follow */}
                  </div>
                  <FollowButton targetId={s.id} initial="none" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {feedPosts && feedPosts.length > 0 ? (
        <div>
          {feedPosts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
          Your feed is empty — <Link href="/search" className="underline hover:no-underline">find people to follow</Link>.
        </p>
      )}
    </section>
  );
}
