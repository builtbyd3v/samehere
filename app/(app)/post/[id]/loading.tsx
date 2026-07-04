import { PostCardSkeleton } from "@/components/ui/Skeleton";

export default function PostLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="mb-4 h-4 w-16 animate-pulse rounded bg-[var(--featured-surface)]" />
      <PostCardSkeleton />
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-[var(--featured-surface)]" />
        <div className="h-24 animate-pulse rounded-lg bg-[var(--featured-surface)]" />
      </div>
    </main>
  );
}
