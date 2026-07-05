import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-20" />
        <div className="flex shrink-0 items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <Skeleton className="mb-6 h-9 w-40 rounded-full" />
      <div className="flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
