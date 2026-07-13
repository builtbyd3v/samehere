export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-post)] p-4 sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-2.5 h-[16.5px] w-full" />
          <Skeleton className="h-[16.5px] w-4/5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-10 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="ml-auto h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <div className="flex gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <Skeleton className="mb-4 h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
