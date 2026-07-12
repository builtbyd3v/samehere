import { ProfileSkeleton } from "@/components/ui/Skeleton";

export default function EditProfileLoading() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <ProfileSkeleton />
    </main>
  );
}
