import { Skeleton } from "@/components/ui/Skeleton";

export default function LeaderboardLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-4 h-9 w-40 rounded-full" />

      <div className="card mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
        <ul className="divide-y divide-[var(--border)]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 w-6 shrink-0" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-12 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
