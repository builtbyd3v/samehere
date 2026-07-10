import { Skeleton } from "@/components/ui/Skeleton";

export default function ClubLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="card p-4 sm:p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-3 h-9 w-24 rounded-md" />
      </div>
      <div className="card mt-5 overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
