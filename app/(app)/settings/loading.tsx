import { Skeleton } from "@/components/ui/Skeleton";
import { AppPage, AppPanel } from "@/components/app/AppPrimitives";

export default function SettingsLoading() {
  return (
    <AppPage width="narrow">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <AppPanel key={i} className="p-5 sm:p-6">
            <Skeleton className="mb-4 h-5 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </AppPanel>
        ))}
      </div>
    </AppPage>
  );
}
