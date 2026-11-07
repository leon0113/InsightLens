'use client';

import { ChartColumn } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/states';
import type { DatetimeColumn, NumericColumn, Report } from '@/lib/api/types';
import { formatCount, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { HistogramChart, MarkerLegend } from '../charts/histogram-chart';
import { MonthlyChart } from '../charts/monthly-chart';
import { SamplingNote } from '../sampling-note';

export function DistributionsTab({ report }: { report: Report }) {
  const numeric = report.columns.filter(
    (c): c is NumericColumn => c.type === 'numeric',
  );
  const datetime = report.columns.filter(
    (c): c is DatetimeColumn => c.type === 'datetime',
  );

  if (numeric.length === 0 && datetime.length === 0) {
    return (
      <EmptyState
        icon={ChartColumn}
        title="Nothing to plot"
        description="This file has no numeric or date columns. Categorical values are listed in the Columns tab."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SamplingNote sampling={report.sampling} />
      {numeric.length > 0 && (
        <section aria-labelledby="numeric-heading" className="space-y-4">
          <h2 id="numeric-heading" className="font-medium">
            Numeric columns
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {numeric.map((column) => (
              <NumericCard key={column.name} column={column} />
            ))}
          </div>
        </section>
      )}
      {datetime.length > 0 && (
        <section aria-labelledby="dates-heading" className="space-y-4">
          <h2 id="dates-heading" className="font-medium">
            Dates
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {datetime.map((column) => (
              <article
                key={column.name}
                className="bg-card space-y-3 rounded-xl border p-5"
              >
                <div className="space-y-0.5">
                  <h3 className="font-mono text-sm font-medium">
                    {column.name}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Rows per month, {formatDate(column.stats.min)} to{' '}
                    {formatDate(column.stats.max)}
                  </p>
                </div>
                <MonthlyChart
                  data={column.stats.monthlyCounts}
                  label={`Rows per month in ${column.name}`}
                />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NumericCard({ column }: { column: NumericColumn }) {
  const { stats } = column;
  const focused = stats.focusedHistogram ?? null;
  const [view, setView] = useState<'focused' | 'full'>(
    focused ? 'focused' : 'full',
  );
  const showFocused = view === 'focused' && focused !== null;
  const bins = showFocused ? focused.bins : stats.histogram;
  const hidden = focused ? focused.belowCount + focused.aboveCount : 0;
  const markers = [
    { label: 'Mean', value: stats.mean },
    { label: 'Median', value: stats.median, dashed: true },
  ];

  return (
    <article className="bg-card space-y-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-mono text-sm font-medium">{column.name}</h3>
          <MarkerLegend markers={markers} />
        </div>
        {focused && (
          <div
            role="group"
            aria-label={`Range shown for ${column.name}`}
            className="bg-muted flex rounded-lg p-0.5 text-xs"
          >
            {(['focused', 'full'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors outline-none',
                  'focus-visible:ring-ring/50 focus-visible:ring-3',
                  view === option
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option === 'focused' ? 'Typical range' : 'Full range'}
              </button>
            ))}
          </div>
        )}
      </div>
      <HistogramChart
        bins={bins}
        markers={markers}
        label={`Histogram of ${column.name} from ${formatNumber(bins[0]!.start)} to ${formatNumber(bins.at(-1)!.end)}`}
      />
      <p className="text-muted-foreground text-xs">
        {showFocused ? (
          <>
            Showing {formatNumber(bins[0]!.start)} to{' '}
            {formatNumber(bins.at(-1)!.end)}. {formatCount(hidden)} outlying{' '}
            {hidden === 1 ? 'value is' : 'values are'} left out
            {focused.aboveCount > 0 && focused.belowCount > 0
              ? ` (${formatCount(focused.belowCount)} below, ${formatCount(focused.aboveCount)} above).`
              : focused.aboveCount > 0
                ? ', all above the range.'
                : ', all below the range.'}
          </>
        ) : (
          <>
            {formatCount(stats.count)} values from {formatNumber(stats.min)} to{' '}
            {formatNumber(stats.max)}
            {stats.skewness !== null && (
              <>, skewness {formatNumber(stats.skewness, 2)}</>
            )}
            .
          </>
        )}
      </p>
    </article>
  );
}
