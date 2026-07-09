import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import { attachSignedMedia } from "@/lib/media";
import { scoreOverlap, type MatchSignal } from "@/lib/match";
import { isPro } from "@/lib/pro";
import SuggestedFollows, { SuggestedFollowsFallback } from "@/components/feed/SuggestedFollows";
import FeedToolbar from "@/components/feed/FeedToolbar";
import FeedTabs from "@/components/feed/FeedTabs";
import EmptyState from "@/components/ui/EmptyState";
import OnboardingChecklist from "@/components/feed/OnboardingChecklist";
import FeedTimeline from "@/components/feed/FeedTimeline";
import { mergeFeedTimeline } from "@/lib/feed-timeline";
import { fetchQuotedReposts } from "@/lib/feed-quotes";
import { FeedSearchForm, FeedSearchResults } from "@/components/feed/FeedSearch";
import PeopleSearch from "@/components/feed/PeopleSearch";
import { getWeeklyPrompt } from "@/lib/weekly-prompt";
import WeeklyPromptCard from "@/components/feed/WeeklyPromptCard";
import WeeklyRecap from "@/components/feed/WeeklyRecap";

// Twitter-style feed: Latest (global recency) and Following (followed users'
// posts + follow requests + suggested users — formerly the dashboard). Only
// the active tab's data is fetched.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; search?: string; compose?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "following" ? "following" : "latest";
  const q = (params.q ?? "").trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const onboardingProfile = user
    ? await supabase.from("profiles").select("avatar_url, bio, is_pro").eq("id", user.id).single()
    : { data: null };
  const composerPro = isPro(onboardingProfile.data ?? { is_pro: false });
  const onboardingCounts = user
    ? await supabase.rpc("get_profile_counts", { p_profile_id: user.id })
    : { data: null };
  const weeklyPrompt = await getWeeklyPrompt();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-[var(--border)] bg-[var(--canvas)]/95 px-4 pb-4 backdrop-blur sm:-mx-5 sm:px-5">
        <FeedToolbar
          title={<h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Feed</h1>}
          search={
            <PeopleSearch
              isPro={composerPro}
              keyword={
                <>
                  <FeedSearchForm q={q} tab={tab} />
                  <FeedSearchResults q={q} />
                </>
              }
            />
          }
          composer={<PostComposer isPro={composerPro} />}
          initialComposeOpen={params.compose === "1"}
        />
        <div className="mt-3">
          <FeedTabs tab={tab} />
        </div>
      </div>

      {user && (
        <OnboardingChecklist
          avatarUrl={onboardingProfile.data?.avatar_url ?? null}
          bio={onboardingProfile.data?.bio ?? null}
          postCount={Number(onboardingCounts.data?.[0]?.posts ?? 0)}
          followingCount={Number(onboardingCounts.data?.[0]?.following ?? 0)}
        />
      )}

      <WeeklyPromptCard prompt={weeklyPrompt.prompt} weekKey={weeklyPrompt.weekKey} />

      {user && <WeeklyRecap userId={user.id} />}

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
  const query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE);

  const [{ data }, { data: blockedIds }] = await Promise.all([
    query.returns<FeedPost[]>(),
    viewerId ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const filtered = data?.filter((p) => !blocked.has(p.user_id));
  const [posts, quotes] = await Promise.all([
    filtered ? attachSignedMedia(supabase, filtered) : Promise.resolve(null),
    fetchQuotedReposts(supabase, { limit: PAGE, blockedIds: blocked }),
  ]);
  const timeline = posts ? mergeFeedTimeline(posts, quotes).slice(0, PAGE) : [];

  return (
    <section className="flex flex-col gap-3">
      {timeline.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Be the first to share what you are building or figuring out."
          action={{ label: "Find students", href: "/feed?search=1" }}
        />
      ) : (
        <>
          <FeedTimeline items={timeline} viewerId={viewerId} />
          <FeedLoadMore
            cursor={timeline[timeline.length - 1].created_at}
            hasMore={timeline.length === PAGE}
            viewerId={viewerId}
          />
        </>
      )}
    </section>
  );
}

async function FollowingTab({
  userId,
  viewerId,
}: {
  userId: string | null;
  viewerId: string | null;
}) {
  // proxy already gates this route; userId is only null for a type-narrowing edge case.
  if (!userId) return null;

  const supabase = await createClient();

  const [{ data: requests }, { data: myFollows }, { data: viewerProfile }, { data: blockedIds }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id, requester:profiles!follows_follower_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder)")
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<FollowRequest[]>(),
    supabase.from("follows").select("following_id, status").eq("follower_id", userId),
    supabase
      .from("profiles")
      .select("year, major, skills, goals, bio, courses, is_pro, profile_school(school)")
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
  const quoteAuthorIds = [userId, ...acceptedIds].filter((id): id is string => !!id);

  const followPostsPromise = (async () => {
    if (!acceptedIds.length) return { data: [] as FeedPost[] };
    const q = supabase
      .from("posts")
      .select(POST_SELECT)
      .in("user_id", acceptedIds)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    return q.returns<FeedPost[]>();
  })();

  const [{ data: followFeed }, quotes, { data: suggestedPool }] = await Promise.all([
    followPostsPromise,
    fetchQuotedReposts(supabase, {
      userIds: quoteAuthorIds,
      limit: PAGE,
      blockedIds: blocked,
    }),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, year, major, skills, goals, bio, courses, is_pro, is_founder, is_campus_founder, profile_school(school)")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const feedPosts = followFeed ? await attachSignedMedia(supabase, followFeed) : null;
  const timeline = feedPosts || quotes.length ? mergeFeedTimeline(feedPosts ?? [], quotes).slice(0, PAGE) : [];

  // ponytail: rank a 30-row recency pool; widen only if suggestions feel stale.
  const viewerPro = isPro(viewerProfile ?? { is_pro: false });
  const viewerSignal: MatchSignal = {
    year: viewerProfile?.year ?? null,
    major: viewerProfile?.major ?? null,
    skills: viewerProfile?.skills ?? null,
    goals: viewerProfile?.goals ?? null,
    bio: viewerProfile?.bio ?? null,
    school: viewerProfile?.profile_school?.school ?? null,
    courses: viewerProfile?.courses ?? null,
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
        courses: s.courses,
      }),
    }))
    .sort((a, b) => b._score - a._score || ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
    .slice(0, 5);

  return (
    <section className="flex flex-col gap-3">
      {visibleRequests.length > 0 && <FollowRequests requests={visibleRequests} />}

      {/* Suggested-users card is AI-generated (up to 5 connectionPrompt calls) —
          wrapped in its own Suspense so it never blocks the timeline below from
          streaming. Fallback reuses the already-fetched (non-AI) suggested pool. */}
      {timeline.length > 0 && suggested.length > 0 && (
        <section className="card mb-3 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People to follow</h2>
          <Suspense fallback={<SuggestedFollowsFallback suggested={suggested} />}>
            <SuggestedFollows userId={userId} viewerSignal={viewerSignal} viewerPro={viewerPro} suggested={suggested} />
          </Suspense>
        </section>
      )}

      {timeline.length > 0 ? (
        <div className="flex flex-col gap-3">
          <FeedTimeline items={timeline} viewerId={viewerId} />
        </div>
      ) : suggested.length > 0 ? (
        <section className="card px-4 py-8 text-center sm:px-6">
          <p className="font-medium text-[var(--ink)]">Your feed is empty</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--ink-muted)]">
            Follow a few students below to start seeing their posts here.
          </p>
          <div className="mt-5 text-left">
            <Suspense fallback={<SuggestedFollowsFallback suggested={suggested} />}>
              <SuggestedFollows userId={userId} viewerSignal={viewerSignal} viewerPro={viewerPro} suggested={suggested} />
            </Suspense>
          </div>
        </section>
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
