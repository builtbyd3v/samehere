import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function PostLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <PostCardSkeleton />
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <Skeleton className="mb-4 h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </main>
  );
}
