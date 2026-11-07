import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DatasetReport } from '@/components/report/dataset-report';
import { ReportSkeleton } from '@/components/report/report-skeleton';

export const metadata: Metadata = { title: 'Report' };

export default function DatasetReportPage({
  params,
}: PageProps<'/datasets/[id]'>) {
  // The id is only known per request, so it resolves inside Suspense and the
  // rest of the page can be prerendered.
  return (
    <Suspense fallback={<ReportSkeleton />}>
      {params.then(({ id }) => (
        <DatasetReport id={id} />
      ))}
    </Suspense>
  );
}
