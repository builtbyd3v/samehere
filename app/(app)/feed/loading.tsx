import { PostCardSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="mb-6 h-8 w-24 animate-pulse rounded-md bg-[var(--featured-surface)]" />
      <div className="mb-6 h-9 w-48 animate-pulse rounded-full bg-[var(--featured-surface)]" />
      <div className="flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
