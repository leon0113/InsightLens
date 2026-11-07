import { Skeleton } from '@/components/ui/skeleton';

export function ReportSkeleton({
  label = 'Loading the report',
}: {
  label?: string;
}) {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 px-4 pt-8 pb-16 sm:px-6"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
