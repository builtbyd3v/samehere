import EmptyState from "@/components/ui/EmptyState";

export default function CommunityPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">Community</h1>
      <div className="mt-5">
        <EmptyState
          title="Clubs are unavailable"
          description="Clubs, Eve, and the leaderboard are retired. Group DMs are unchanged."
        />
      </div>
    </main>
  );
}
