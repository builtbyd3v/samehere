import { Suspense } from "react";
import CommunityTabs from "@/components/community/CommunityTabs";
import ClubsTab from "@/app/(app)/community/ClubsTab";
import LeaderboardTab from "@/app/(app)/community/LeaderboardTab";
import { Skeleton } from "@/components/ui/Skeleton";

function CommunityTabFallback({ tab }: { tab: "clubs" | "leaderboard" }) {
  return (
    <div className="card mt-5 overflow-hidden" aria-label={tab === "clubs" ? "Loading clubs" : "Loading leaderboard"}>
      <ul className="divide-y divide-[var(--border)]">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Community shell: Clubs (default) + Leaderboard tabs, server-rendered via
// searchParams like /leaderboard's own scope param.
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "leaderboard" ? "leaderboard" : "clubs";

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Community</h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Clubs to join and a leaderboard to climb.
      </p>

      <CommunityTabs tab={tab} />

      <Suspense key={tab} fallback={<CommunityTabFallback tab={tab} />}>
        {tab === "clubs" ? <ClubsTab /> : <LeaderboardTab scope={params.scope} />}
      </Suspense>
    </main>
  );
}
