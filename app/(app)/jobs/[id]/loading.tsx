import { Skeleton } from "@/components/ui/Skeleton";
import { AppPage, AppPanel } from "@/components/app/AppPrimitives";

export default function JobDetailLoading() {
  return (
    <AppPage width="wide">
      <Skeleton className="mb-4 h-4 w-36" />
      <div className="mb-2 flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
        <div className="flex flex-col gap-5">
          <AppPanel className="p-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-[16.5px] w-full" />
              <Skeleton className="h-[16.5px] w-full" />
              <Skeleton className="h-[16.5px] w-4/5" />
            </div>
          </AppPanel>
          <AppPanel className="p-5">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-[16.5px] w-full" />
              <Skeleton className="h-[16.5px] w-5/6" />
            </div>
          </AppPanel>
        </div>
        <AppPanel className="p-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-4 h-9 w-full rounded-full" />
        </AppPanel>
      </div>
    </AppPage>
  );
}
