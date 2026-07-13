import { Skeleton } from "@/components/ui/Skeleton";

export default function JobsLoading() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-7 w-20" />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-paper">
        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      <Skeleton className="mt-4 h-3 w-24" />

      <div className="mt-2 flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-paper">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
