import { Suspense } from "react";
import { getViewer, getViewerProfile, getViewerProfileCounts } from "@/lib/viewer";
import { POST_SELECT, PAGE, withEngagement, type PostRow } from "@/components/feed/PostCard";
import FeedTabs from "@/components/feed/FeedTabs";
import FeedLabelChips from "@/components/feed/FeedLabelChips";
import FeedTimeline from "@/components/feed/FeedTimeline";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FollowingSeed from "@/components/feed/FollowingSeed";
import EmptyState from "@/components/ui/EmptyState";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import { attachSignedMedia } from "@/lib/media";
import { mergeFeedTimeline, itemId } from "@/lib/feed-timeline";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { encodeCursor } from "@/lib/feed-cursor";
import { isPro } from "@/lib/pro";
import { CONTEXT_LABEL_COPY, type ContextLabel } from "@/lib/context-label";
import { LABELED_SEED_LIMIT, parseFeedView, shouldSeedFollowing, type FeedTab } from "@/lib/feed-label";
import { fetchLabeledPosts } from "@/lib/feed-labeled";
import RightRail, { RightRailFallback } from "./RightRail";
import ComposerToggle from "./ComposerToggle";
import LeftRail, { LeftRailFallback } from "./LeftRail";
import OnboardingChecklist from "@/components/feed/OnboardingChecklist";
import NewPostsPill from "./NewPostsPill";
import { loadMoreLabeledPosts } from "./actions";
import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

// Desktop feed redesign, now the live /feed. The app shell (app/(app)/layout.tsx)
// supplies the persistent left nav; this page is a two-column layout — the
// Latest/Following timeline centered, with a right rail stacking profile+heatmap
// (LeftRail) above suggested/invite (RightRail). The
// composer is collapsed behind a trigger; `data-feed-page` lets the shell drop
// its right spacer so this page's own rail balances the left nav.
//
// Known gaps vs the previous feed (see README follow-ups): the weekly recap card
// was folded into the profile heatmap. People-search is NOT on the feed; it
// lives at /search now.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; label?: string }>;
}) {
  const { tab, label } = parseFeedView(await searchParams);
  const { user } = await getViewer();
  const viewerId = user?.id ?? null;

  return (
    <main data-feed-page className="page-enter grid grid-cols-1 justify-center gap-7 py-6 lg:py-8 xl:grid-cols-[minmax(0,600px)_340px]">
      <div className="min-w-0">
        <Suspense fallback={<FeedHeaderFallback tab={tab} label={label} />}>
          <FeedHeader tab={tab} label={label} userId={user?.id ?? null} />
        </Suspense>

        <Suspense fallback={<FeedTimelineFallback />}>
          <div id="feed-panel" role="tabpanel" aria-labelledby={tab === "following" ? "feed-tab-following" : "feed-tab-latest"}>
            {tab === "following" ? (
              <FollowingTab userId={user?.id ?? null} viewerId={viewerId} />
            ) : label ? (
              <LabeledTab viewerId={viewerId} label={label} />
            ) : (
              <LatestTab viewerId={viewerId} />
            )}
          </div>
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

function FeedFilters({ tab, label }: { tab: FeedTab; label: ContextLabel | null }) {
  return (
    <div className="mt-3 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
      <FeedTabs tab={tab} />
      <FeedLabelChips active={label} />
    </div>
  );
}

// Composer trigger + tabs + onboarding checklist. Suspense-wrapped so its own
// profile/counts fetch runs independently of (not before) the timeline
// below — same reasoning as LeftRail/RightRail's own boundaries.
async function FeedHeader({
  tab,
  label,
  userId,
}: {
  tab: FeedTab;
  label: ContextLabel | null;
  userId: string | null;
}) {
  const composerProfile = userId ? await getViewerProfile() : null;
  const composerPro = isPro(composerProfile ?? { is_pro: false, pro_until: null });

  let counts: Awaited<ReturnType<typeof getViewerProfileCounts>> = null;
  let isSuspended = false;
  if (userId) {
    const { supabase } = await getViewer();
    const [countsResult, suspendedResult] = await Promise.all([
      getViewerProfileCounts(),
      supabase.rpc("current_is_suspended"),
    ]);
    counts = countsResult;
    isSuspended = suspendedResult.data ?? false;
  }

  return (
    <>
      <div className="sticky top-14 z-30 mb-4 -mt-2 border-b border-[var(--border)] bg-[var(--canvas)]/95 pt-2 pb-3 backdrop-blur">
        <h1 className="sr-only">Feed</h1>
        <ComposerToggle isPro={composerPro} avatarUrl={composerProfile?.avatar_url ?? null} isSuspended={isSuspended} />
        <FeedFilters tab={tab} label={label} />
      </div>
      {userId && (
        <OnboardingChecklist
          avatarUrl={composerProfile?.avatar_url ?? null}
          bio={composerProfile?.bio ?? null}
          postCount={counts?.posts ?? 0}
          followingCount={counts?.following ?? 0}
          verifiedStudent={!!composerProfile?.verified_student}
        />
      )}
    </>
  );
}

function FeedHeaderFallback({ tab, label }: { tab: FeedTab; label: ContextLabel | null }) {
  return (
    <div className="sticky top-14 z-30 mb-4 -mt-2 border-b border-[var(--border)] bg-[var(--canvas)]/95 pt-2 pb-3 backdrop-blur">
      <h1 className="sr-only">Feed</h1>
      <Skeleton className="h-[68px] w-full rounded-2xl" />
      <FeedFilters tab={tab} label={label} />
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
  const { supabase } = await getViewer();
  // Stage 1 after auth: posts + blocks + quotes + reposts. Quotes/reposts
  // filter blocked authors in JS so they do not wait on get_blocked_ids.
  const [{ data }, { data: blockedIds }, rawQuotes, rawReposts] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE)
      .returns<PostRow[]>(),
    viewerId ? supabase.rpc("get_blocked_ids") : Promise.resolve({ data: [] as string[] }),
    fetchQuotedReposts(supabase, { limit: PAGE }),
    fetchPlainReposts(supabase, { limit: PAGE }),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const postRows = (data ?? []).filter((p) => !blocked.has(p.user_id));
  const quotesUnblocked = rawQuotes.filter((q) => !blocked.has(q.user_id));
  const repostsUnblocked = rawReposts.filter((r) => !blocked.has(r.user_id));

  // Stage 2: signed media + mine-state. Mine-state needs post ids only.
  const allForSigning = [
    ...postRows,
    ...quotesUnblocked.map((q) => q.post),
    ...repostsUnblocked.map((r) => r.post),
  ];
  const postIds = [...new Set(allForSigning.map((p) => p.id))];
  const repostIds = quotesUnblocked.map((q) => q.id);
  const [signedPosts, mine] = await Promise.all([
    allForSigning.length ? attachSignedMedia(supabase, allForSigning) : Promise.resolve([]),
    fetchViewerMineState(supabase, viewerId, postIds, repostIds),
  ]);
  const signedById = new Map(signedPosts.map((p) => [p.id, p]));
  const engagedById = new Map(withEngagement([...signedById.values()], mine).map((p) => [p.id, p]));

  const posts = postRows.map((r) => engagedById.get(r.id)!);
  const quotes = quotesUnblocked.map((r) => toQuotedRepost(r, engagedById.get(r.post.id)!, mine));
  const reposts = repostsUnblocked.map((r) => ({
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
        description="Be the first to share what you’re building, learning, or stuck on."
        action={{ label: "Find people", href: "/search" }}
        secondaryAction={{ label: "Edit profile", href: "/profile/edit" }}
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

// One label, network-wide, recency. Posts only — quotes/reposts have no
// context_label of their own. Query-only; same RLS + block filter as Latest.
async function LabeledTab({ viewerId, label }: { viewerId: string | null; label: ContextLabel }) {
  const { supabase } = await getViewer();
  const posts = await fetchLabeledPosts(supabase, { viewerId, label, limit: PAGE });

  if (posts.length === 0) {
    return (
      <EmptyState
        title={`No ${CONTEXT_LABEL_COPY[label]} posts yet`}
        description="Be the first. Post what's getting you there."
        action={{ label: "Back to Latest", href: "/feed" }}
      />
    );
  }

  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const last = items[items.length - 1];
  const lastCursor = encodeCursor(last.created_at, itemId(last));
  return (
    <section className="flex flex-col gap-3">
      <NewPostsPill since={items[0].created_at} label={label} />
      <FeedTimeline items={items} viewerId={viewerId} />
      <FeedLoadMore
        key={`${label}:${lastCursor}`}
        auto
        cursor={lastCursor}
        hasMore={items.length === PAGE}
        viewerId={viewerId}
        action={loadMoreLabeledPosts.bind(null, label)}
      />
    </section>
  );
}

// Following = followed users' posts (first page). Pending follow requests render
// above the timeline so private-account approvals still have a home on the feed.
// Under 5 follows + empty timeline: seed with recent labeled posts (bet 2).
async function FollowingTab({ userId, viewerId }: { userId: string | null; viewerId: string | null }) {
  if (!userId) return null; // proxy gates this route; null is a type edge case

  const { supabase } = await getViewer();
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

  const postRows = followFeed ?? [];
  const allForSigning = [...postRows, ...rawQuotes.map((q) => q.post), ...rawReposts.map((r) => r.post)];
  const postIds = [...new Set(allForSigning.map((p) => p.id))];
  const repostIds = rawQuotes.map((q) => q.id);
  const [signedPosts, mine] = await Promise.all([
    allForSigning.length ? attachSignedMedia(supabase, allForSigning) : Promise.resolve([]),
    fetchViewerMineState(supabase, viewerId, postIds, repostIds),
  ]);
  const signedById = new Map(signedPosts.map((p) => [p.id, p]));
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
  const thinFollowing = acceptedIds.length === 0;

  const seed = shouldSeedFollowing(acceptedIds.length) && timeline.length === 0;
  const seedPosts = seed
    ? (
        await fetchLabeledPosts(supabase, {
          viewerId,
          limit: PAGE,
          blockedIds: blocked,
          excludeUserIds: [userId, ...acceptedIds],
        })
      ).slice(0, LABELED_SEED_LIMIT)
    : [];

  return (
    <section className="flex flex-col gap-3">
      {visibleRequests.length > 0 && <FollowRequests requests={visibleRequests} />}
      {timeline.length > 0 ? (
        <FeedTimeline items={timeline} viewerId={viewerId} />
      ) : seed ? (
        <FollowingSeed posts={seedPosts} viewerId={viewerId} />
      ) : thinFollowing ? (
        <EmptyState
          title="Follow people to shape this feed"
          description="Until you follow a few students, Latest is the best place to find Stuck, Learning, and Building posts."
          action={{ label: "Find people", href: "/search" }}
          secondaryAction={{ label: "See Latest", href: "/feed" }}
        />
      ) : (
        <EmptyState
          title="Quiet for now"
          description="People you follow haven’t posted yet. Check Latest for Stuck posts from the wider network."
          action={{ label: "See Latest", href: "/feed" }}
          secondaryAction={{ label: "Find more people", href: "/search" }}
        />
      )}
    </section>
  );
}
