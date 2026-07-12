import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <Skeleton className="mb-1 h-7 w-32" />
      <Skeleton className="mb-5 h-4 w-24" />

      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
