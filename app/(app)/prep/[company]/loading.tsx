import { Skeleton } from "@/components/ui/Skeleton";

export default function PrepCompanyLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <Skeleton className="mb-3 h-3 w-48" />
      <Skeleton className="mb-2 h-3 w-16" />
      <Skeleton className="h-10 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-6 h-16 w-full rounded-[var(--landing-radius-sm)]" />
      <div className="mt-6 space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-[var(--landing-radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--landing-radius-sm)]" />
            </div>
            <Skeleton className="mt-3 h-5 w-4/5 max-w-lg" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-[var(--landing-radius-sm)]" />
              <Skeleton className="h-20 w-full rounded-[var(--landing-radius-sm)]" />
            </div>
            <Skeleton className="mt-4 h-28 w-full rounded-[var(--landing-radius-sm)]" />
            <Skeleton className="mt-3 h-10 w-36" />
          </div>
        ))}
      </div>
    </main>
  );
}
