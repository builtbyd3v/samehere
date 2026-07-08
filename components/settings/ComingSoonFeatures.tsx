export default function ComingSoonFeatures() {
  return (
    <section className="card mb-6 p-6">
      <h2 className="mb-1 text-lg font-semibold">Coming soon</h2>
      <p className="mb-4 text-sm text-[var(--ink-muted)]">Planned for a later release.</p>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4">
        <p className="text-sm font-medium text-[var(--ink)]">Collab posts</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Co-author a post with another student. Both names on the card, both credited when it publishes.
        </p>
      </div>
    </section>
  );
}
