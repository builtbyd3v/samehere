import { Skeleton } from "@/components/ui/Skeleton";

export default function ProjectLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl py-6 md:py-8">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-[var(--landing-radius-sm)]" />
        <Skeleton className="h-7 w-16 rounded-[var(--landing-radius-sm)]" />
        <Skeleton className="h-7 w-28 rounded-[var(--landing-radius-sm)]" />
      </div>
      <div className="mt-8 rounded-[var(--landing-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <Skeleton className="h-4 w-3/4 max-w-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 w-full rounded-[var(--landing-radius)]" />
        <Skeleton className="h-36 w-full rounded-[var(--landing-radius)]" />
      </div>
    </main>
  );
}
