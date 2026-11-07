'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Search, SearchX, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { DeleteDatasetButton } from '@/components/datasets/delete-dataset-button';
import { StatusBadge } from '@/components/datasets/status-badge';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { Dataset } from '@/lib/api/types';
import {
  formatBytes,
  formatCount,
  formatDateTime,
  MISSING_VALUE,
} from '@/lib/format';
import { DEMO_PATH } from '@/lib/routes';

const PAGE_SIZE = 10;
const POLL_MS = 3000;

export function DatasetsView() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchTerm = useDebouncedValue(search.trim());
  const params = { page, limit: PAGE_SIZE, searchTerm };

  const query = useQuery({
    queryKey: queryKeys.datasetList(params),
    queryFn: () => api.datasets.list(params),
    placeholderData: keepPreviousData,
    // Keep checking while any analysis on this page is still running.
    refetchInterval: (q) =>
      q.state.data?.data.some((d) => d.status === 'processing')
        ? POLL_MS
        : false,
  });

  const datasets = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Deleting the last dataset on a page leaves it empty; step back one page.
  // Adjusting state while rendering avoids an extra render with the empty page.
  if (
    query.isSuccess &&
    !query.isPlaceholderData &&
    datasets.length === 0 &&
    page > 1
  ) {
    setPage(page - 1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Datasets
          </h1>
          <p className="text-muted-foreground">
            Every CSV you upload, with the status of its analysis.
          </p>
        </div>
        <Button asChild className="h-10 px-4">
          <Link href="/upload">
            <Upload aria-hidden="true" />
            Upload CSV
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by file name"
          aria-label="Search datasets by file name"
          className="h-10 pl-9"
          maxLength={100}
        />
      </div>

      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState
          title="Your datasets could not be loaded"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      ) : datasets.length === 0 && searchTerm ? (
        <EmptyState
          icon={SearchX}
          title="No matching datasets"
          description={
            <>
              Nothing is named like{' '}
              <span className="text-foreground font-mono">{searchTerm}</span>.
              Check the spelling or clear the search.
            </>
          }
          action={
            <Button variant="outline" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No datasets yet"
          description="Upload a CSV to get its report. Not sure what to expect? Open the demo first."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/upload">Upload a CSV</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={DEMO_PATH}>Open the demo</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <DatasetTable datasets={datasets} />
          <nav
            aria-label="Pagination"
            className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p className="tabular-nums">
              {formatCount((page - 1) * PAGE_SIZE + 1)} to{' '}
              {formatCount((page - 1) * PAGE_SIZE + datasets.length)} of{' '}
              {formatCount(total)}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

function DatasetTable({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              File
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-medium md:table-cell"
            >
              Rows
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-medium md:table-cell"
            >
              Columns
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-medium sm:table-cell"
            >
              Size
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-medium lg:table-cell"
            >
              Uploaded
            </th>
            <th scope="col" className="w-12 px-2 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {datasets.map((dataset) => (
            <tr
              key={dataset._id}
              className="hover:bg-accent/50 transition-colors"
            >
              <td className="max-w-0 px-4 py-3 sm:max-w-none">
                <Link
                  href={`/datasets/${dataset._id}`}
                  className="hover:text-primary block truncate rounded-sm font-mono font-medium"
                  title={dataset.name}
                >
                  {dataset.name}
                </Link>
                {dataset.status === 'failed' && dataset.errorMessage && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {dataset.errorMessage}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={dataset.status} />
              </td>
              <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                {dataset.rowCount === undefined
                  ? MISSING_VALUE
                  : formatCount(dataset.rowCount)}
              </td>
              <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                {dataset.columnCount === undefined
                  ? MISSING_VALUE
                  : formatCount(dataset.columnCount)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 text-right font-mono whitespace-nowrap tabular-nums sm:table-cell">
                {formatBytes(dataset.sizeBytes)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 whitespace-nowrap lg:table-cell">
                {formatDateTime(dataset.createdAt)}
              </td>
              <td className="px-2 py-2 text-right">
                <DeleteDatasetButton id={dataset._id} name={dataset.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border" aria-busy="true">
      <span className="sr-only">Loading datasets</span>
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-0"
        >
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}
