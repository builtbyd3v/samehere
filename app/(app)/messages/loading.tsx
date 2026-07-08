import { Skeleton } from "@/components/ui/Skeleton";

export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="mb-5 h-8 w-32" />
      <div className="card overflow-hidden">
        <Skeleton className="h-14 w-full rounded-none" />
        <div className="divide-y divide-[var(--border)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
