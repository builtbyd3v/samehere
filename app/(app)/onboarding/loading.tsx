import { ProfileSkeleton } from "@/components/ui/Skeleton";

export default function OnboardingLoading() {
  return (
    <main className="mx-auto w-full max-w-[880px] pt-16 md:pt-24">
      <ProfileSkeleton />
    </main>
  );
}
