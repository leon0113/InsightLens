'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CircleAlert,
  FileQuestion,
  LoaderCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { DeleteDatasetButton } from '@/components/datasets/delete-dataset-button';
import { StatusBadge } from '@/components/datasets/status-badge';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ApiError, api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { formatBytes } from '@/lib/format';
import { ReportSkeleton } from './report-skeleton';
import { ReportView } from './report-view';

const POLL_MS = 2000;

const BackLink = () => (
  <Link
    href="/datasets"
    className="hover:text-foreground inline-flex items-center gap-1.5 rounded-sm"
  >
    <ArrowLeft className="size-4" aria-hidden="true" />
    All datasets
  </Link>
);

export function DatasetReport({ id }: { id: string }) {
  const router = useRouter();
  const dataset = useQuery({
    queryKey: queryKeys.dataset(id),
    queryFn: () => api.datasets.get(id),
    refetchInterval: (q) =>
      q.state.data?.status === 'processing' ? POLL_MS : false,
  });
  const report = useQuery({
    queryKey: queryKeys.report(id),
    queryFn: () => api.reports.get(id),
    enabled: dataset.data?.status === 'ready',
    // A finished report never changes.
    staleTime: Infinity,
  });

  if (dataset.isPending) return <ReportSkeleton />;

  if (dataset.isError) {
    const notFound =
      dataset.error instanceof ApiError && dataset.error.status === 404;
    return (
      <Frame>
        {notFound ? (
          <EmptyState
            icon={FileQuestion}
            title="Dataset not found"
            description="It may have been deleted, or the link is wrong."
            action={
              <Button asChild variant="outline">
                <Link href="/datasets">Back to datasets</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            message={dataset.error.message}
            onRetry={() => dataset.refetch()}
          />
        )}
      </Frame>
    );
  }

  const { name, status, errorMessage, sizeBytes } = dataset.data;

  if (status !== 'ready') {
    return (
      <Frame>
        <div className="bg-card space-y-5 rounded-2xl border p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading min-w-0 text-2xl font-semibold tracking-tight break-all">
              {name}
            </h1>
            <StatusBadge status={status} />
          </div>
          {status === 'processing' ? (
            <p
              className="text-muted-foreground flex items-center gap-2.5"
              aria-live="polite"
            >
              <LoaderCircle
                className="text-primary size-5 animate-spin"
                aria-hidden="true"
              />
              Analyzing {formatBytes(sizeBytes)}. This page updates by itself
              when the report is ready.
            </p>
          ) : (
            <>
              <div
                role="alert"
                className="bg-critical-soft text-critical flex gap-2.5 rounded-lg px-3.5 py-3 text-sm"
              >
                <CircleAlert
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>{errorMessage ?? 'The analysis failed.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/upload">Upload another file</Link>
                </Button>
                <DeleteDatasetButton
                  id={id}
                  name={name}
                  variant="text"
                  onDeleted={() => router.push('/datasets')}
                />
              </div>
            </>
          )}
        </div>
      </Frame>
    );
  }

  if (report.isPending) return <ReportSkeleton />;
  if (report.isError) {
    return (
      <Frame>
        <ErrorState
          title="The report could not be loaded"
          message={report.error.message}
          onRetry={() => report.refetch()}
        />
      </Frame>
    );
  }

  return (
    <ReportView
      report={report.data.report}
      title={name}
      eyebrow={<BackLink />}
      actions={
        <DeleteDatasetButton
          id={id}
          name={name}
          variant="text"
          onDeleted={() => router.push('/datasets')}
        />
      }
    />
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-8 pb-16 sm:px-6">
      <div className="text-muted-foreground text-sm">
        <BackLink />
      </div>
      {children}
    </div>
  );
}
