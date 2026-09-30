import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <main className="mx-auto max-w-[620px]">
      <div className="flex h-11 items-center gap-6 border-b border-[var(--hairline)] lg:h-16">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex flex-col">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
