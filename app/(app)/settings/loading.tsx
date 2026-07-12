import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Skeleton className="mb-6 h-7 w-32" />

      <div className="space-y-5">
        <div className="card p-6">
          <Skeleton className="mb-4 h-5 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="card p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="card p-6">
          <Skeleton className="mb-4 h-5 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="mt-6 h-4 w-28" />
        </div>
        <div className="card p-6">
          <Skeleton className="mb-1 h-5 w-24" />
          <Skeleton className="mt-4 h-9 w-40 rounded-full" />
        </div>
      </div>
    </main>
  );
}
