import { Skeleton } from "@/components/ui/Skeleton";

export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="w-full space-y-3">
        <Skeleton className="mx-auto h-8 w-36" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </main>
  );
}
