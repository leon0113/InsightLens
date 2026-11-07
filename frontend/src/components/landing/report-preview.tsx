import { SeverityBadge } from '@/components/severity-badge';
import type { Severity } from '@/lib/api/types';
import { formatCount, formatNumber, formatPercent } from '@/lib/format';

// A snapshot of the clinic appointments demo report, so the landing page shows
// real output without waiting for the API.
const SNAPSHOT = {
  fileName: 'clinic_appointments.csv',
  rowCount: 3000,
  columnCount: 13,
  missingPercent: 7.76,
  insightCount: 11,
  histogram: {
    column: 'systolic_bp',
    mean: 121.596485,
    median: 122,
    counts: [5, 16, 64, 169, 311, 462, 632, 481, 339, 215, 67, 21, 6],
  },
  insights: [
    {
      severity: 'critical',
      title: 'High missing rate in visit_reason',
      message: '1,652 of 3,000 values are missing.',
    },
    {
      severity: 'warning',
      title: 'Many outliers in wait_minutes',
      message: '192 values fall outside the expected range of -17.12 to 58.67.',
    },
  ] satisfies { severity: Severity; title: string; message: string }[],
};

export function ReportPreview() {
  const { histogram } = SNAPSHOT;
  const tallest = Math.max(...histogram.counts);
  const figures = [
    { label: 'Rows', value: formatCount(SNAPSHOT.rowCount) },
    { label: 'Columns', value: formatCount(SNAPSHOT.columnCount) },
    { label: 'Missing', value: formatPercent(SNAPSHOT.missingPercent) },
    { label: 'Insights', value: formatCount(SNAPSHOT.insightCount) },
  ];

  return (
    <figure className="bg-card rounded-xl border shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(0_0_0/0.12)]">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <span className="truncate font-mono text-sm font-medium">
          {SNAPSHOT.fileName}
        </span>
        <span className="bg-primary-soft text-primary-strong inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-current" />
          Ready
        </span>
      </div>

      <dl className="grid grid-cols-4 border-b">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={
              index > 0 ? 'border-l px-3 py-3 sm:px-4' : 'px-3 py-3 sm:px-4'
            }
          >
            <dt className="text-muted-foreground text-xs">{figure.label}</dt>
            <dd className="mt-0.5 font-mono text-base font-medium tabular-nums sm:text-lg">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3 border-b px-5 py-4">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-mono font-medium">{histogram.column}</span>
          <span className="text-muted-foreground font-mono tabular-nums">
            mean {formatNumber(histogram.mean)} · median{' '}
            {formatNumber(histogram.median)}
          </span>
        </div>
        <div
          role="img"
          aria-label={`Histogram of ${histogram.column}, bell shaped around ${formatNumber(histogram.median)}`}
          className="flex h-24 items-end gap-1"
        >
          {histogram.counts.map((count, index) => (
            <span
              key={index}
              className="bg-chart-1/85 flex-1 rounded-t-[3px]"
              style={{ height: `${(count / tallest) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <ul className="divide-y px-5">
        {SNAPSHOT.insights.map((insight) => (
          <li key={insight.title} className="flex gap-3 py-3.5">
            <SeverityBadge severity={insight.severity} />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-muted-foreground text-sm">{insight.message}</p>
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">
        Part of the report InsightLens produces for the clinic appointments
        sample dataset.
      </figcaption>
    </figure>
  );
}
