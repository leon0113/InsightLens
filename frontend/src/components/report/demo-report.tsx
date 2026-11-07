'use client';

import { useQuery } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ApiError, api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { DEMO_DATASETS, demoPath } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';
import { ReportView } from './report-view';

export function DemoReport({ slug }: { slug: string }) {
  const demo = useQuery({
    queryKey: queryKeys.demoReport(slug),
    queryFn: () => api.reports.demo(slug),
    staleTime: Infinity,
  });

  if (demo.isPending) return <ReportSkeleton label="Loading the demo report" />;

  if (demo.isError) {
    const notFound =
      demo.error instanceof ApiError && demo.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {notFound ? (
          <EmptyState
            icon={FileQuestion}
            title="This demo does not exist"
            description="Pick one of the sample datasets instead."
            action={<DemoSwitcher current={null} className="justify-center" />}
          />
        ) : (
          <ErrorState
            title="The demo report could not be loaded"
            message={demo.error.message}
            onRetry={() => demo.refetch()}
          />
        )}
      </div>
    );
  }

  const { dataset, report } = demo.data;
  return (
    <ReportView
      report={report}
      title={dataset.name}
      eyebrow={
        <div className="space-y-4">
          <DemoSwitcher current={slug} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="bg-primary-soft text-primary-strong rounded-full px-2.5 py-1 text-xs font-medium">
              Demo report
            </span>
            <span>Synthetic data, generated for this demo</span>
          </div>
        </div>
      }
      description={dataset.description}
      actions={
        <Button asChild>
          <Link href="/register">Analyze your own CSV</Link>
        </Button>
      }
    />
  );
}

function DemoSwitcher({
  current,
  className,
}: {
  current: string | null;
  className?: string;
}) {
  return (
    <nav
      aria-label="Demo datasets"
      className={cn('flex flex-wrap gap-2', className)}
    >
      {DEMO_DATASETS.map((demo) => (
        <Link
          key={demo.slug}
          href={demoPath(demo.slug)}
          aria-current={demo.slug === current ? 'page' : undefined}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            demo.slug === current
              ? 'bg-foreground text-background'
              : 'bg-card hover:bg-accent',
          )}
        >
          {demo.title}
        </Link>
      ))}
    </nav>
  );
}
