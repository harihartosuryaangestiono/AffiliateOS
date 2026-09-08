import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div aria-label="Loading workspace" className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-28 rounded-xl" key={i} />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
