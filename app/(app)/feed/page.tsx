import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getViewer, getViewerProfile, getViewerProfileCounts } from "@/lib/viewer";
import { shouldRedirectToOnboarding } from "@/lib/onboarding";
import { POST_SELECT, PAGE, withEngagement, type PostRow } from "@/components/feed/PostCard";
import FeedTimeline from "@/components/feed/FeedTimeline";
import FeedLoadMore from "@/components/feed/FeedLoadMore";
import FollowingSeed from "@/components/feed/FollowingSeed";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { UnderlineTabs } from "@/components/ui/UnderlineTabs";
import SearchBar from "@/components/search/SearchBar";
import FollowRequests, { type FollowRequest } from "@/components/profile/FollowRequests";
import { CTA, feed } from "@/lib/copy-voice";
import { attachSignedMedia } from "@/lib/media";
import { mergeFeedTimeline, itemId } from "@/lib/feed-timeline";
import { fetchQuotedReposts, toQuotedRepost } from "@/lib/feed-quotes";
import { fetchPlainReposts } from "@/lib/feed-reposts";
import { fetchViewerMineState } from "@/lib/feed-engagement";
import { encodeCursor } from "@/lib/feed-cursor";
import { isPro } from "@/lib/pro";
import { CONTEXT_LABEL_COPY, type ContextLabel } from "@/lib/context-label";
import {
  FEED_TABS,
  LABELED_SEED_LIMIT,
  activeFeedTab,
  feedPath,
  parseFeedView,
  shouldSeedFollowing,
  stuckOpenOnly,
  type FeedTabKey,
} from "@/lib/feed-label";
import { fetchLabeledPosts } from "@/lib/feed-labeled";
import { STAGE_LABELS, STAGE_MOMENT_COOKIE, parseStage, parseStageMoment } from "@/lib/stage";
import RightRail, { RightRailFallback } from "./RightRail";
import ComposerToggle from "./ComposerToggle";
import OnboardingChecklist from "@/components/feed/OnboardingChecklist";
import NewPostsPill from "./NewPostsPill";
import { loadMoreLabeledPosts, loadMoreStagePosts } from "./actions";
import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

// The live /feed. The app shell (app/(app)/layout.tsx) supplies the left nav;
// this page is a 620px post column (underline tabs, composer line, flat post
// rows) plus a 320px right rail from xl. `data-feed-page` lets the shell drop
// its content max-width and padding so the columns reach the hairlines.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; label?: string; open?: string }>;
}) {
  const params = await searchParams;
  const { tab, label } = parseFeedView(params);
  const openOnly = stuckOpenOnly(label, params.open);
  const { user } = await getViewer();
  // New accounts see onboarding once; the wizard marks onboarded_at on first mount (plan 023).
  if (user && shouldRedirectToOnboarding(await getViewerProfile())) redirect("/onboarding?from=redirect");
  const viewerId = user?.id ?? null;

  return (
    <main data-feed-page className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="mx-auto w-full min-w-0 max-w-[620px] pb-8">
        <FeedTabRow active={activeFeedTab({ tab, label })} />
        <Suspense fallback={<ComposerFallback />}>
          <FeedHeader userId={user?.id ?? null} />
        </Suspense>
        {label && label !== "stuck" ? <LabelFilterRow label={label} /> : null}
        <Suspense fallback={<FeedTimelineFallback />}>
          <div id="feed-panel">
            {tab === "following" ? (
              <FollowingTab userId={user?.id ?? null} viewerId={viewerId} />
            ) : tab === "stage" ? (
              <StageTab viewerId={viewerId} />
            ) : label ? (
              <LabeledTab viewerId={viewerId} label={label} openOnly={openOnly} />
            ) : (
              <LatestTab viewerId={viewerId} />
            )}
          </div>
        </Suspense>
      </div>

      <aside className="hidden border-l border-[var(--hairline)] xl:block">
        <div className="sticky top-0 flex max-h-dvh flex-col gap-7 overflow-y-auto px-6 py-5">
          <SearchBar variant="rail" />
          <Suspense fallback={<RightRailFallback />}>
            <RightRail />
          </Suspense>
        </div>
      </aside>
    </main>
  );
}

function FeedTabRow({ active }: { active: FeedTabKey | null }) {
  const tabs = FEED_TABS.map((t) => ({
    href: t.href,
    label: t.short ? (
      <>
        <span className="lg:hidden">{t.short}</span>
        <span className="hidden lg:inline">{t.label}</span>
      </>
    ) : (
      t.label
    ),
  }));
  const activeHref = FEED_TABS.find((t) => t.key === active)?.href ?? "";
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b border-[var(--hairline)] bg-[var(--bg)]/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:px-0">
      <h1 className="sr-only">Feed</h1>
      <UnderlineTabs tabs={tabs} activeHref={activeHref} label="Feed" />
    </div>
  );
}

// Composer line + onboarding checklist. Suspense-wrapped so its own
// profile/counts fetch runs independently of (not before) the timeline below.
async function FeedHeader({ userId }: { userId: string | null }) {
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
  const stageMoment = userId ? parseStageMoment((await cookies()).get(STAGE_MOMENT_COOKIE)?.value) : null;

  return (
    <>
      <ComposerToggle
        isPro={composerPro}
        avatarUrl={composerProfile?.avatar_url ?? null}
        username={composerProfile?.username ?? ""}
        isSuspended={isSuspended}
        stageMoment={stageMoment}
      />
      {userId && (
        <OnboardingChecklist
          avatarUrl={composerProfile?.avatar_url ?? null}
          bio={composerProfile?.bio ?? null}
          postCount={counts?.posts ?? 0}
          followingCount={counts?.following ?? 0}
          verifiedStudent={!!composerProfile?.verified_student}
          stage={composerProfile?.stage ?? null}
        />
      )}
    </>
  );
}

function ComposerFallback() {
  return (
    <div className="hidden border-b border-[var(--hairline)] py-5 lg:block">
      <Skeleton className="h-[74px] w-full rounded-xl" />
    </div>
  );
}

function LabelFilterRow({ label }: { label: ContextLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--hairline)] py-3 text-sm text-[var(--muted)]">
      <span>Showing {CONTEXT_LABEL_COPY[label]} posts</span>
      <Link href={feedPath()} className="text-[var(--ink)] hover:underline">
        Clear
      </Link>
    </div>
  );
}

function FeedTimelineFallback() {
  return (
    <div className="flex flex-col">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}

// Your stage = posts from public authors at the viewer's stage, recency.
// Posts only, same shape as LabeledTab. The stage comes from the viewer's row.
// ponytail: no "N new posts" pill here (countNewerPosts counts all authors);
// add a stage filter to it if users ask.
async function StageTab({ viewerId }: { viewerId: string | null }) {
  const profile = await getViewerProfile();
  const stage = parseStage(profile?.stage);
  if (!stage) {
    return (
      <EmptyState
        title="Pick your stage to see this feed"
        description="Tell us where you're at, like learning the basics or hunting internships, and this tab shows posts from people at the same stage."
        action={{ label: "Set your stage", href: "/profile/edit" }}
      />
    );
  }
  const { supabase } = await getViewer();
  const posts = await fetchLabeledPosts(supabase, { viewerId, authorStage: stage, limit: PAGE });
  if (posts.length === 0) {
    return (
      <EmptyState
        title="Quiet at your stage"
        description={`No posts yet from people at your stage (${STAGE_LABELS[stage]}). Be the first.`}
        action={{ label: CTA.seeLatest, href: "/feed" }}
      />
    );
  }
  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const last = items[items.length - 1];
  const lastCursor = encodeCursor(last.created_at, itemId(last));
  return (
    <section className="flex flex-col">
      <FeedTimeline items={items} viewerId={viewerId} />
      <FeedLoadMore
        key={`stage:${lastCursor}`}
        auto
        cursor={lastCursor}
        hasMore={items.length === PAGE}
        viewerId={viewerId}
        action={loadMoreStagePosts}
      />
    </section>
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
        title={feed.latestEmpty.title}
        description={feed.latestEmpty.description}
        action={{ label: CTA.findPeople, href: "/search" }}
        secondaryAction={{ label: CTA.editProfile, href: "/profile/edit" }}
      />
    );
  }
  const last = timeline[timeline.length - 1];
  const lastCursor = encodeCursor(last.created_at, itemId(last));
  return (
    <section className="flex flex-col">
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
async function LabeledTab({
  viewerId,
  label,
  openOnly,
}: {
  viewerId: string | null;
  label: ContextLabel;
  openOnly: boolean;
}) {
  const { supabase } = await getViewer();
  const posts = await fetchLabeledPosts(supabase, { viewerId, label, openOnly, limit: PAGE });

  const toggle =
    label === "stuck" ? (
      <div className="border-b border-[var(--hairline)] py-3">
        <Button
          variant={openOnly ? "secondary" : "outline"}
          size="sm"
          href={feedPath({ label: "stuck", open: !openOnly })}
          aria-current={openOnly ? "page" : undefined}
        >
          Open only
        </Button>
      </div>
    ) : null;

  if (posts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {toggle}
        <EmptyState
          title={`No ${CONTEXT_LABEL_COPY[label]} posts yet`}
          description="Be the first. Post what's getting you there."
          action={{ label: "Back to Latest", href: "/feed" }}
        />
      </div>
    );
  }

  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const last = items[items.length - 1];
  const lastCursor = encodeCursor(last.created_at, itemId(last));
  return (
    <section className="flex flex-col">
      {toggle}
      <NewPostsPill since={items[0].created_at} label={label} />
      <FeedTimeline items={items} viewerId={viewerId} />
      <FeedLoadMore
        key={`${label}:${openOnly ? "open" : "all"}:${lastCursor}`}
        auto
        cursor={lastCursor}
        hasMore={items.length === PAGE}
        viewerId={viewerId}
        action={loadMoreLabeledPosts.bind(null, label, openOnly)}
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
    <section className="flex flex-col">
      {visibleRequests.length > 0 && <FollowRequests requests={visibleRequests} />}
      {timeline.length > 0 ? (
        <FeedTimeline items={timeline} viewerId={viewerId} />
      ) : seed ? (
        <FollowingSeed posts={seedPosts} viewerId={viewerId} />
      ) : thinFollowing ? (
        <EmptyState
          title={feed.followingThin.title}
          description={feed.followingThin.description}
          action={{ label: CTA.findPeople, href: "/search" }}
          secondaryAction={{ label: CTA.seeLatest, href: "/feed" }}
        />
      ) : (
        <EmptyState
          title={feed.followingQuiet.title}
          description={feed.followingQuiet.description}
          action={{ label: CTA.seeLatest, href: "/feed" }}
          secondaryAction={{ label: CTA.findPeople, href: "/search" }}
        />
      )}
    </section>
  );
}
