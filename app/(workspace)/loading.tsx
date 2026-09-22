import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="space-y-6">
      <span className="sr-only">Loading your workspace…</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton className="h-28" key={i} />
        ))}
      </div>
      <div className="panel p-5 space-y-5">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="flex gap-4" key={i}>
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
