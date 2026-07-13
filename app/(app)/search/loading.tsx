import { Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="h-10 w-full rounded-md" />

      <section className="mt-6">
        <Skeleton className="mb-3 h-4 w-16" />
        <ul className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card flex items-center gap-2.5 px-3 py-2.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
