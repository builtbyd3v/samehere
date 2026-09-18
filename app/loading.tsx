import { Skeleton } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[77rem] px-4 py-20" aria-busy="true" aria-label="Loading">
      <Skeleton className="mx-auto h-4 w-40" />
      <Skeleton className="mx-auto mt-8 h-12 w-full max-w-xl" />
      <Skeleton className="mx-auto mt-4 h-12 w-full max-w-lg" />
      <Skeleton className="mx-auto mt-8 h-10 w-36 rounded-full" />
    </main>
  );
}
