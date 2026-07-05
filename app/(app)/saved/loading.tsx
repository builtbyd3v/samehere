import { Skeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function SavedLoading() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Skeleton className="mb-5 h-8 w-20" />
      <div className="flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
