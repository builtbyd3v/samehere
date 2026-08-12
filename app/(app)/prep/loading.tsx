import { Skeleton } from "@/components/ui/Skeleton";

export default function PrepLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <Skeleton className="mb-2 h-3 w-16" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
      <div className="mt-8 overflow-hidden rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0 sm:px-5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-3 w-3 shrink-0" />
          </div>
        ))}
      </div>
    </main>
  );
}
