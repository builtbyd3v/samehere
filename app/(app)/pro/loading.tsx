import { Skeleton } from "@/components/ui/Skeleton";

export default function ProLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-64" />

      <div className="card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <Skeleton className="mt-2 h-4 w-3/5" />
      </div>
    </main>
  );
}
