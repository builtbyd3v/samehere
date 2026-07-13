import { Skeleton } from "@/components/ui/Skeleton";

export default function JobDetailLoading() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="h-4 w-20" />

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper">
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-[16.5px] w-full" />
          <Skeleton className="h-[16.5px] w-full" />
          <Skeleton className="h-[16.5px] w-4/5" />
        </div>
      </div>
    </main>
  );
}
