import { Skeleton } from "@/components/ui/Skeleton";

export default function ProjectFormLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-6 h-10 w-full" />
      <Skeleton className="mt-3 h-24 w-full" />
      <Skeleton className="mt-3 h-10 w-full" />
      <Skeleton className="mt-6 h-10 w-28 rounded-full" />
    </main>
  );
}
