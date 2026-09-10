import EmptyState from "@/components/ui/EmptyState";

export default function JobDetailPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <EmptyState
        title="Jobs are unavailable"
        description="This listing cannot be opened. Job actions are paused."
      />
    </main>
  );
}
