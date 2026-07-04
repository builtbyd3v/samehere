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
import FeedToolbar from "@/components/feed/FeedToolbar";
import FeedTabs from "@/components/feed/FeedTabs";
import AvatarImage from "@/components/ui/AvatarImage";
import EmptyState from "@/components/ui/EmptyState";
import OnboardingChecklist from "@/components/feed/OnboardingChecklist";
import QuotedRepostCard, { type QuotedRepost } from "@/components/feed/QuotedRepostCard";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import { FeedSearchForm, FeedSearchResults } from "@/components/feed/FeedSearch";

// Twitter-style feed: Latest (global recency) and Following (followed users'
// posts + follow requests + suggested users — formerly the dashboard). Only
// the active tab's data is fetched.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; search?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "following" ? "following" : "latest";
  const q = (params.q ?? "").trim();
  const searchOpen = params.search === "1" || !!q;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const onboardingProfile = user
    ? await supabase.from("profiles").select("avatar_url, bio").eq("id", user.id).single()
    : { data: null };
  const onboardingCounts = user
    ? await supabase.rpc("get_profile_counts", { p_profile_id: user.id })
    : { data: null };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-[var(--border)] bg-[var(--canvas)]/95 px-4 pb-4 backdrop-blur sm:-mx-5 sm:px-5">
        <FeedToolbar
          title={<h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Feed</h1>}
          initialSearchOpen={searchOpen}
          search={
            <>
              <FeedSearchForm q={q} tab={tab} />
              <FeedSearchResults q={q} />
            </>
          }
          composer={<PostComposer />}
        />
        <FeedTabs tab={tab} />
      </div>

      {user && (
        <OnboardingChecklist
          avatarUrl={onboardingProfile.data?.avatar_url ?? null}
          bio={onboardingProfile.data?.bio ?? null}
          postCount={Number(onboardingCounts.data?.[0]?.posts ?? 0)}
          followingCount={Number(onboardingCounts.data?.[0]?.following ?? 0)}
        />
      )}

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
  // ponytail: app-side filter post-fetch, not RLS on posts.
  const [{ data }, { data: blockedIds }] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .returns<FeedPost[]>(),
    viewerId ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const filtered = data?.filter((p) => !blocked.has(p.user_id));
  const posts = filtered ? await attachSignedMedia(supabase, filtered) : null;

  return (
    <section className="flex flex-col gap-3">
      {!posts || posts.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Be the first to share what you are building or figuring out."
          action={{ label: "Find students", href: "/feed?search=1" }}
        />
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

  const [{ data: requests }, { data: myFollows }, { data: viewerProfile }, { data: blockedIds }] = await Promise.all([
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
    // ponytail: app-side filter post-fetch, not RLS on posts.
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const visibleRequests = (requests ?? []).filter((r) => !blocked.has(r.follower_id));

  const acceptedIds = (myFollows ?? []).filter((f) => f.status === "accepted").map((f) => f.following_id);
  const excludeIds = [userId, ...blocked, ...(myFollows ?? []).map((f) => f.following_id)]; // never empty (has me)

  // ponytail: Following feed is first-page only; add cursor load-more if it grows.
  // ponytail: followed users' own posts only; reposts-in-feed deferred.
  const [{ data: followFeed }, { data: quoteRows }, { data: suggestedPool }] = await Promise.all([
    acceptedIds.length
      ? supabase
          .from("posts")
          .select(POST_SELECT)
          .in("user_id", acceptedIds)
          .order("created_at", { ascending: false })
          .limit(PAGE)
          .returns<FeedPost[]>()
      : Promise.resolve({ data: [] as FeedPost[] }),
    acceptedIds.length
      ? supabase
          .from("reposts")
          .select(
            `id, quote_text, created_at, user_id, reposter:profiles!reposts_user_id_fkey(username, display_name, avatar_url, is_pro, is_founder), post:posts(${POST_SELECT})`,
          )
          .in("user_id", acceptedIds)
          .not("quote_text", "is", null)
          .order("created_at", { ascending: false })
          .limit(PAGE)
      : Promise.resolve({ data: [] as { id: string; quote_text: string; created_at: string; reposter: QuotedRepost["reposter"]; post: FeedPost | null }[] }),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, year, major, skills, goals, bio, is_pro, is_founder, profile_school(school)")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const feedPosts = followFeed ? await attachSignedMedia(supabase, followFeed) : null;

  const quotePosts = (quoteRows ?? [])
    .filter((r): r is typeof r & { post: FeedPost; quote_text: string; reposter: QuotedRepost["reposter"] } => !!r.post && !!r.quote_text && !!r.reposter)
    .map((r) => r.post);
  const quotesWithMedia = quotePosts.length ? await attachSignedMedia(supabase, quotePosts) : [];
  const mediaByPostId = new Map(quotesWithMedia.map((p) => [p.id, p]));

  const quotes: QuotedRepost[] = (quoteRows ?? [])
    .filter((r) => r.post && r.quote_text && r.reposter)
    .map((r) => ({
      id: r.id,
      quote_text: r.quote_text!,
      created_at: r.created_at!,
      reposter: r.reposter!,
      original: mediaByPostId.get(r.post!.id) ?? (r.post as FeedPost),
    }));

  const timeline = feedPosts ? mergeFeedTimeline(feedPosts, quotes).slice(0, PAGE) : [];

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
    <section className="flex flex-col gap-3">
      {visibleRequests.length > 0 && <FollowRequests requests={visibleRequests} />}

      {suggested && suggested.length > 0 && (
        <section className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People to follow</h2>
          <div className="flex flex-col gap-2">
            {suggestedWithPrompt.map((s) => {
              const name = s.display_name ?? s.username;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
                >
                  {s.avatar_url ? (
                    <AvatarImage
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
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <Link href={`/profile/${s.username}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                      <UserBadges isPro={s.is_pro} isFounder={s.is_founder} />
                      <span className="text-[var(--ink-muted)]">@{s.username}</span>
                    </div>
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

      {timeline.length > 0 ? (
        <div className="flex flex-col gap-3">
          {timeline.map((item) =>
            item.kind === "post" ? (
              <PostCard key={item.post.id} post={item.post} viewerId={viewerId} />
            ) : (
              <QuotedRepostCard key={item.quote.id} item={item.quote} viewerId={viewerId} />
            ),
          )}
        </div>
      ) : (
        <EmptyState
          title="Your feed is empty"
          description="Follow students to see their posts and quote reposts here."
          action={{ label: "Search students", href: "/feed?search=1" }}
        />
      )}
    </section>
  );
}
