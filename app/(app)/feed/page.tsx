import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";
import { attachSignedMedia } from "@/lib/media";
import { scoreOverlap, type MatchSignal } from "@/lib/match";
import { connectionPrompt } from "@/lib/connection-prompt";

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

  const [{ data: requests }, { data: myFollows }, { data: viewerProfile }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id, requester:profiles!follows_follower_id_fkey(username, display_name, avatar_url, is_pro, is_founder)")
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<FollowRequest[]>(),
    supabase.from("follows").select("following_id, status").eq("follower_id", userId),
    supabase
      .from("profiles")
      .select("year, major, skills, goals, bio, profile_school(school)")
      .eq("id", userId)
      .single(),
  ]);

  const acceptedIds = (myFollows ?? []).filter((f) => f.status === "accepted").map((f) => f.following_id);
  const excludeIds = [userId, ...(myFollows ?? []).map((f) => f.following_id)]; // never empty (has me)

  // ponytail: Following feed is first-page only; add cursor load-more if it grows.
  // ponytail: followed users' own posts only; reposts-in-feed deferred.
  const [{ data: followFeed }, { data: suggestedPool }] = await Promise.all([
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
      .select("id, username, display_name, avatar_url, created_at, year, major, skills, goals, bio, is_pro, is_founder, profile_school(school)")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const feedPosts = followFeed ? await attachSignedMedia(supabase, followFeed) : null;

  // ponytail: rank a 30-row recency pool; widen only if suggestions feel stale.
  const viewerSignal: MatchSignal = {
    year: viewerProfile?.year ?? null,
    major: viewerProfile?.major ?? null,
    skills: viewerProfile?.skills ?? null,
    goals: viewerProfile?.goals ?? null,
    bio: viewerProfile?.bio ?? null,
    school: viewerProfile?.profile_school?.school ?? null,
  };
  const suggested = (suggestedPool ?? [])
    .map((s) => ({
      ...s,
      _score: scoreOverlap(viewerSignal, {
        year: s.year,
        major: s.major,
        skills: s.skills,
        goals: s.goals,
        bio: s.bio,
        school: s.profile_school?.school ?? null,
      }),
    }))
    .sort((a, b) => b._score - a._score || ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
    .slice(0, 5);

  const prompts = await Promise.all(
    suggested.map((s) =>
      connectionPrompt(supabase, userId, viewerSignal, {
        id: s.id,
        name: s.display_name ?? s.username,
        year: s.year,
        major: s.major,
        skills: s.skills,
        goals: s.goals,
        bio: s.bio,
        school: s.profile_school?.school ?? null,
      })
    )
  );
  const suggestedWithPrompt = suggested.map((s, i) => ({ ...s, _prompt: prompts[i] }));

  return (
    <section className="mt-6">
      {requests && requests.length > 0 && <FollowRequests requests={requests} />}

      {suggested && suggested.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium">People to follow</h2>
          <div className="space-y-2">
            {suggestedWithPrompt.map((s) => {
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
                    <UserBadges isPro={s.is_pro} isFounder={s.is_founder} />
                    <span className="ml-1.5 text-[var(--ink-muted)]">@{s.username}</span>
                    {s._prompt && (
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{s._prompt}</p>
                    )}
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
