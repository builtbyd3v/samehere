export default function ApplicationsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--featured-surface)]" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[var(--featured-surface)]" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[var(--featured-surface)]" />
    </main>
  );
}
