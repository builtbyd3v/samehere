import { PostCardSkeleton } from "@/components/ui/Skeleton";

export default function SavedLoading() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-5 h-8 w-20 animate-pulse rounded-md bg-[var(--featured-surface)]" />
      <div className="flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
