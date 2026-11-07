'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CircleAlert,
  FileSpreadsheet,
  LoaderCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { UploadDropzone } from '@/components/upload/upload-dropzone';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { formatBytes, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const POLL_MS = 2000;

export function UploadView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = useMutation({
    mutationFn: (selected: File) => api.datasets.upload(selected, setProgress),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.datasets }),
  });
  const datasetId = upload.data?._id;

  // After the 202, ask for the dataset every two seconds until it settles.
  const dataset = useQuery({
    queryKey: queryKeys.dataset(datasetId ?? ''),
    queryFn: () => api.datasets.get(datasetId!),
    enabled: Boolean(datasetId),
    refetchInterval: (q) =>
      q.state.data?.status === 'processing' ? POLL_MS : false,
  });
  const status = dataset.data?.status;

  useEffect(() => {
    if (status === 'ready' && datasetId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.datasets });
      router.push(`/datasets/${datasetId}`);
    }
  }, [status, datasetId, queryClient, router]);

  function start(selected: File) {
    setFile(selected);
    setProgress(0);
    upload.mutate(selected);
  }

  function reset() {
    setFile(null);
    setProgress(0);
    upload.reset();
  }

  const failure = upload.isError
    ? upload.error.message
    : dataset.isError
      ? dataset.error.message
      : status === 'failed'
        ? (dataset.data?.errorMessage ?? 'The analysis failed.')
        : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Upload a CSV
        </h1>
        <p className="text-muted-foreground">
          The delimiter and text encoding are detected for you. The file is
          deleted as soon as the analysis finishes; only the report is kept.
        </p>
      </div>

      {!file ? (
        <UploadDropzone onFile={start} />
      ) : (
        <section
          aria-live="polite"
          className="bg-card space-y-6 rounded-2xl border p-6"
        >
          <div className="flex items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <FileSpreadsheet className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium">
                {file.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatBytes(file.size)}
              </p>
            </div>
          </div>

          {failure ? (
            <div className="space-y-4">
              <div
                role="alert"
                className="bg-critical-soft text-critical flex gap-2.5 rounded-lg px-3.5 py-3 text-sm"
              >
                <CircleAlert
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>{failure}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={reset}>Choose another file</Button>
                {datasetId && (
                  <Button asChild variant="outline">
                    <Link href="/datasets">Go to datasets</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ol className="space-y-4">
              <Step
                state={upload.isSuccess ? 'done' : 'active'}
                title="Uploading"
                detail={
                  upload.isSuccess ? undefined : (
                    <ProgressBar value={progress} />
                  )
                }
              />
              <Step
                state={
                  !upload.isSuccess
                    ? 'waiting'
                    : status === 'ready'
                      ? 'done'
                      : 'active'
                }
                title="Analyzing every column"
                detail={
                  upload.isSuccess && status !== 'ready'
                    ? 'Usually a few seconds; large files can take a few minutes. You can leave this page, the analysis keeps running.'
                    : undefined
                }
              />
              <Step
                state={status === 'ready' ? 'active' : 'waiting'}
                title="Opening the report"
              />
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

type StepState = 'waiting' | 'active' | 'done';

function Step({
  state,
  title,
  detail,
}: {
  state: StepState;
  title: string;
  detail?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          state === 'done' && 'bg-primary text-primary-foreground',
          state === 'active' && 'text-primary',
          state === 'waiting' && 'border-border border-2',
        )}
        aria-hidden="true"
      >
        {state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
        {state === 'active' && <LoaderCircle className="size-5 animate-spin" />}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p
          className={cn(
            'text-sm font-medium',
            state === 'waiting' && 'text-muted-foreground',
          )}
        >
          {title}
          <span className="sr-only">
            {state === 'done'
              ? ' (done)'
              : state === 'active'
                ? ' (in progress)'
                : ''}
          </span>
        </p>
        {typeof detail === 'string' ? (
          <p className="text-muted-foreground text-sm">{detail}</p>
        ) : (
          detail
        )}
      </div>
    </li>
  );
}

function ProgressBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-muted-foreground w-10 text-right font-mono text-xs tabular-nums">
        {formatPercent(percent, 0)}
      </span>
    </div>
  );
}
