import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile, getViewerProfileCounts } from "@/lib/viewer";
import { POST_SELECT, PAGE, withEngagement, type PostRow } from "@/components/feed/PostCard";
import FeedTabs from "@/components/feed/FeedTabs";
import FeedTimeline from "@/components/feed/FeedTimeline";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import EmptyState from "@/components/ui/EmptyState";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import { attachSignedMedia } from "@/lib/media";
import { mergeFeedTimeline, itemId } from "@/lib/feed-timeline";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { encodeCursor } from "@/lib/feed-cursor";
import { isPro } from "@/lib/pro";
import RightRail, { RightRailFallback } from "./RightRail";
import ComposerToggle from "./ComposerToggle";
import LeftRail, { LeftRailFallback } from "./LeftRail";
import OnboardingChecklist from "@/components/feed/OnboardingChecklist";
import NewPostsPill from "./NewPostsPill";
import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

// Desktop feed redesign, now the live /feed. The app shell (app/(app)/layout.tsx)
// supplies the persistent left nav; this page is a two-column layout — the
// Latest/Following timeline centered, with a right rail stacking profile+heatmap
// (LeftRail) above trending/suggested/leaderboard/invite (RightRail). The
// composer is collapsed behind a trigger; `data-feed-page` lets the shell drop
// its right spacer so this page's own rail balances the left nav.
//
// Known gaps vs the previous feed (see README follow-ups): the weekly recap card
// was folded into the profile heatmap. People-search is NOT on the feed; it
// lives at /search now.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "following" ? "following" : "latest";
  const { user } = await getViewer();
  const viewerId = user?.id ?? null;

  return (
    <main data-feed-page className="page-enter grid grid-cols-1 justify-center gap-7 py-6 lg:py-8 xl:grid-cols-[minmax(0,600px)_340px]">
      <div className="min-w-0">
        <Suspense fallback={<FeedHeaderFallback tab={tab} />}>
          <FeedHeader tab={tab} userId={user?.id ?? null} />
        </Suspense>

        <Suspense fallback={<FeedTimelineFallback />}>
          {tab === "latest" ? (
            <LatestTab viewerId={viewerId} />
          ) : (
            <FollowingTab userId={user?.id ?? null} viewerId={viewerId} />
          )}
        </Suspense>
      </div>

      {/* Right rail — wide desktop only; the feed reads full-width below xl. */}
      <aside className="hidden xl:block">
        <div className="sticky top-20 flex flex-col gap-4">
          <Suspense fallback={<LeftRailFallback />}>
            <LeftRail />
          </Suspense>
          <Suspense fallback={<RightRailFallback />}>
            <RightRail />
          </Suspense>
        </div>
      </aside>
    </main>
  );
}

// Composer trigger + tabs + onboarding checklist. Suspense-wrapped so its own
// profile/counts/clubs fetch runs independently of (not before) the timeline
// below — same reasoning as LeftRail/RightRail's own boundaries.
async function FeedHeader({ tab, userId }: { tab: "latest" | "following"; userId: string | null }) {
  const composerProfile = userId ? await getViewerProfile() : null;
  const composerPro = isPro(composerProfile ?? { is_pro: false, pro_until: null });

  let counts: Awaited<ReturnType<typeof getViewerProfileCounts>> = null;
  let inClub = false;
  if (userId) {
    const { supabase } = await getViewer();
    const [countsResult, clubsResult] = await Promise.all([
      getViewerProfileCounts(),
      supabase.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    counts = countsResult;
    inClub = (clubsResult.count ?? 0) > 0;
  }

  return (
    <>
      <div className="sticky top-14 z-30 mb-4 -mt-2 border-b border-[var(--border)] bg-[var(--canvas)]/95 pt-2 pb-3 backdrop-blur">
        <h1 className="sr-only">Feed</h1>
        <ComposerToggle isPro={composerPro} avatarUrl={composerProfile?.avatar_url ?? null} />
        <div className="mt-3">
          <FeedTabs tab={tab} basePath="/feed" />
        </div>
      </div>
      {userId && (
        <OnboardingChecklist
          avatarUrl={composerProfile?.avatar_url ?? null}
          bio={composerProfile?.bio ?? null}
          postCount={counts?.posts ?? 0}
          followingCount={counts?.following ?? 0}
          verifiedStudent={!!composerProfile?.verified_student}
          inClub={inClub}
        />
      )}
    </>
  );
}

function FeedHeaderFallback({ tab }: { tab: "latest" | "following" }) {
  return (
    <div className="sticky top-14 z-30 mb-4 -mt-2 border-b border-[var(--border)] bg-[var(--canvas)]/95 pt-2 pb-3 backdrop-blur">
      <h1 className="sr-only">Feed</h1>
      <Skeleton className="h-[68px] w-full rounded-2xl" />
      <div className="mt-3">
        <FeedTabs tab={tab} basePath="/feed" />
      </div>
    </div>
  );
}

function FeedTimelineFallback() {
  return (
    <div className="flex flex-col gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}

// Latest = global recency. Posts + quote-reposts + plain reposts merged, blocked
// authors filtered app-side, sliced to one page.
async function LatestTab({ viewerId }: { viewerId: string | null }) {
  const supabase = await createClient();
  const [{ data }, { data: blockedIds }] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE)
      .returns<PostRow[]>(),
    viewerId ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const postRows = (data ?? []).filter((p) => !blocked.has(p.user_id));

  const [rawQuotes, rawReposts] = await Promise.all([
    fetchQuotedReposts(supabase, { limit: PAGE, blockedIds: blocked }),
    fetchPlainReposts(supabase, { limit: PAGE, blockedIds: blocked }),
  ]);

  // Shared signing batch: ONE Storage round trip for every original post
  // surfaced by any of the three sources (was 3 separate attachSignedMedia
  // calls -- one inline here, one inside fetchQuotedReposts, one inside
  // fetchPlainReposts).
  const allForSigning = [...postRows, ...rawQuotes.map((q) => q.post), ...rawReposts.map((r) => r.post)];
  const signedById = new Map(
    (allForSigning.length ? await attachSignedMedia(supabase, allForSigning) : []).map((p) => [p.id, p]),
  );

  const postIds = [...signedById.keys()];
  const repostIds = rawQuotes.map((q) => q.id);
  const mine = await fetchViewerMineState(supabase, viewerId, postIds, repostIds);
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const posts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = rawQuotes.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = rawReposts.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: engagedById.get(r.post.id)!,
  }));

  const timeline =
    posts.length || quotes.length || reposts.length ? mergeFeedTimeline(posts, quotes, reposts).slice(0, PAGE) : [];

  if (timeline.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Be the first to share what you are building or figuring out."
        action={{ label: "Explore the community", href: "/community" }}
      />
    );
  }
  const last = timeline[timeline.length - 1];
  const lastCursor = encodeCursor(last.created_at, itemId(last));
  return (
    <section className="flex flex-col gap-3">
      <NewPostsPill since={timeline[0].created_at} />
      <FeedTimeline items={timeline} viewerId={viewerId} />
      {/* key by the last cursor so a router.refresh() (new-posts pill) remounts
          this with fresh pagination state instead of keeping the stale cursor. */}
      <FeedLoadMore key={lastCursor} auto cursor={lastCursor} hasMore={timeline.length === PAGE} viewerId={viewerId} />
    </section>
  );
}

// Following = followed users' posts (first page). Pending follow requests render
// above the timeline so private-account approvals still have a home on the feed.
async function FollowingTab({ userId, viewerId }: { userId: string | null; viewerId: string | null }) {
  if (!userId) return null; // proxy gates this route; null is a type edge case

  const supabase = await createClient();
  const [{ data: myFollows }, { data: requests }, { data: blockedIds }] = await Promise.all([
    supabase.from("follows").select("following_id, status").eq("follower_id", userId),
    supabase
      .from("follows")
      .select(
        "follower_id, requester:profiles!follows_follower_id_fkey(username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student)",
      )
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<FollowRequest[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const visibleRequests = (requests ?? []).filter((r) => !blocked.has(r.follower_id));
  const acceptedIds = (myFollows ?? [])
    .filter((f) => f.status === "accepted")
    .map((f) => f.following_id)
    .filter((id): id is string => !!id);
  const quoteAuthorIds = [userId, ...acceptedIds];

  const [{ data: followFeed }, rawQuotes, rawReposts] = await Promise.all([
    acceptedIds.length
      ? supabase
          .from("posts")
          .select(POST_SELECT)
          .in("user_id", acceptedIds)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(PAGE)
          .returns<PostRow[]>()
      : Promise.resolve({ data: [] as PostRow[] }),
    fetchQuotedReposts(supabase, { userIds: quoteAuthorIds, limit: PAGE, blockedIds: blocked }),
    fetchPlainReposts(supabase, { userIds: quoteAuthorIds, limit: PAGE, blockedIds: blocked }),
  ]);

  // Shared signing batch (see LatestTab above for why).
  const postRows = followFeed ?? [];
  const allForSigning = [...postRows, ...rawQuotes.map((q) => q.post), ...rawReposts.map((r) => r.post)];
  const signedById = new Map(
    (allForSigning.length ? await attachSignedMedia(supabase, allForSigning) : []).map((p) => [p.id, p]),
  );

  const postIds = [...signedById.keys()];
  const repostIds = rawQuotes.map((q) => q.id);
  const mine = await fetchViewerMineState(supabase, viewerId, postIds, repostIds);
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const feedPosts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = rawQuotes.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = rawReposts.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    reposter_id: r.user_id,
    reposter: r.reposter,
    original: engagedById.get(r.post.id)!,
  }));
  const timeline =
    feedPosts.length || quotes.length || reposts.length ? mergeFeedTimeline(feedPosts, quotes, reposts).slice(0, PAGE) : [];

  return (
    <section className="flex flex-col gap-3">
      {visibleRequests.length > 0 && <FollowRequests requests={visibleRequests} />}
      {timeline.length > 0 ? (
        <FeedTimeline items={timeline} viewerId={viewerId} />
      ) : (
        <EmptyState
          title="Your feed is empty"
          description="Follow students to see their posts here."
          action={{ label: "Find people", href: "/community" }}
        />
      )}
    </section>
  );
}
