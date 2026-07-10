import CommunityTabs from "@/components/community/CommunityTabs";
import ClubsTab from "@/app/(app)/community/ClubsTab";
import LeaderboardTab from "@/app/(app)/community/LeaderboardTab";

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

      {tab === "clubs" ? <ClubsTab /> : <LeaderboardTab scope={params.scope} />}
    </main>
  );
}
