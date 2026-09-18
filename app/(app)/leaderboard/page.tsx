import EmptyState from "@/components/ui/EmptyState";

export default function LeaderboardPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <EmptyState
        title="Leaderboard is unavailable"
        description="Rankings are retired. Your posts and heatmap are unchanged."
      />
    </main>
  );
}
