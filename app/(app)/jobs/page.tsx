import EmptyState from "@/components/ui/EmptyState";

export default function JobsPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">Jobs</h1>
      <div className="mt-5">
        <EmptyState
          title="Jobs are unavailable"
          description="Listings and job actions are paused. Historical records stay in place."
        />
      </div>
    </main>
  );
}
