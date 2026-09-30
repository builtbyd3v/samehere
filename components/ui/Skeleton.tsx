export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 border-b border-[var(--hairline)] py-4 lg:gap-3.5 lg:py-[22px]">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-10 rounded-full" />
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="card-surface mt-3 p-5 sm:p-6">
      <Skeleton className="mb-4 h-3 w-20" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ProfilePostsSkeleton() {
  return (
    <section>
      <Skeleton className="mb-3 h-3 w-14" />
      <div className="flex flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </section>
  );
}

export function PortfolioSectionsFallback() {
  return (
    <div className="portfolio-stack mt-6">
      <HeatmapSkeleton />
      <ProfilePostsSkeleton />
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
