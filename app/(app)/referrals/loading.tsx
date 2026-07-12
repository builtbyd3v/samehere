import { Skeleton } from "@/components/ui/Skeleton";

export default function ReferralsLoading() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Skeleton className="mb-1 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-full" />

      <div className="card p-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="mt-4 h-4 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
    </main>
  );
}
