import { ProfileSkeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <ProfileSkeleton />
      <div className="mt-6 flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
