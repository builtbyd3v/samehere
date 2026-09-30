import { ProfileSkeleton, PostCardSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl py-6 sm:py-8 xl:max-w-[1120px]">
      <ProfileSkeleton />
      <div className="mt-6 flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </main>
  );
}
