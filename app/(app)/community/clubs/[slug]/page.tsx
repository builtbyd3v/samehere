import EmptyState from "@/components/ui/EmptyState";

export default function ClubPage() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <EmptyState
        title="Clubs are unavailable"
        description="Club pages and actions are retired. Historical records stay in place."
      />
    </main>
  );
}
