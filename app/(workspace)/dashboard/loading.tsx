import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-5">
      <span className="sr-only">Loading performance and activity…</span>
      <div className="space-y-4 py-6">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-24 w-96 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-96 max-w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
