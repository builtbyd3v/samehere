import { Skeleton } from "@/components/ui/Skeleton";

export default function MessageThreadLoading() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-4 py-4 sm:px-5 sm:py-6">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:px-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 bg-[var(--canvas)] p-5">
          <Skeleton className="ml-auto h-12 w-48 rounded-2xl" />
          <Skeleton className="h-12 w-56 rounded-2xl" />
          <Skeleton className="ml-auto h-10 w-36 rounded-2xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-none" />
      </section>
    </main>
  );
}
