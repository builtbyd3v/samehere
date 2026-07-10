import CommunityTabs from "@/components/community/CommunityTabs";
import EmptyState from "@/components/ui/EmptyState";

// Community shell: Clubs (default) + Threads tabs, server-rendered via searchParams
// like /leaderboard's scope. Both tabs are empty-state placeholders for now — a
// later wave fills in the real clubs/ and threads/ surfaces.
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "threads" ? "threads" : "clubs";

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Community</h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Clubs to join and weekly threads to talk in.
      </p>

      <CommunityTabs tab={tab} />

      <div className="card mt-5">
        {tab === "clubs" ? (
          <EmptyState title="No clubs yet" description="Clubs are coming soon." />
        ) : (
          <EmptyState title="No prompt this week" description="Check back soon for this week's thread." />
        )}
      </div>
    </main>
  );
}
