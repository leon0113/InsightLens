import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Report } from '@/lib/api/types';
import {
  formatBytes,
  formatCount,
  formatDateTime,
  formatPercent,
} from '@/lib/format';
import { InsightCard } from '../insight-card';
import {
  COLUMN_TYPE_ORDER,
  COLUMN_TYPES,
  delimiterLabel,
  encodingLabel,
} from '../labels';
import { SamplingNote } from '../sampling-note';

const TOP_INSIGHTS = 3;

export function OverviewTab({
  report,
  onShowInsights,
}: {
  report: Report;
  onShowInsights: () => void;
}) {
  const { overview, source, sampling, insights } = report;
  const counts = {
    critical: insights.filter((i) => i.severity === 'critical').length,
    warning: insights.filter((i) => i.severity === 'warning').length,
  };

  const figures = [
    {
      label: 'Rows',
      value: formatCount(overview.rowCount),
      detail: `${formatCount(overview.columnCount)} columns`,
    },
    {
      label: 'Missing cells',
      value: formatPercent(overview.missingPercent),
      detail: `${formatCount(overview.missingCellCount)} cells`,
    },
    {
      label: 'Duplicate rows',
      value: formatCount(overview.duplicateRowCount),
      detail: `${formatPercent(overview.duplicateRowPercent)} of rows`,
    },
    {
      label: 'Insights',
      value: formatCount(insights.length),
      detail: `${formatCount(counts.critical)} critical, ${formatCount(counts.warning)} ${counts.warning === 1 ? 'warning' : 'warnings'}`,
    },
  ];

  return (
    <div className="space-y-6">
      <dl className="bg-card grid grid-cols-2 rounded-xl border lg:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={[
              'space-y-1 px-5 py-4',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t lg:border-t-0',
              index === 2 && 'lg:border-l',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <dt className="text-muted-foreground text-sm">{figure.label}</dt>
            <dd className="font-mono text-2xl font-medium tabular-nums">
              {figure.value}
            </dd>
            <dd className="text-muted-foreground text-xs">{figure.detail}</dd>
          </div>
        ))}
      </dl>

      <SamplingNote sampling={sampling} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="space-y-6">
          <section
            aria-labelledby="types-heading"
            className="bg-card space-y-4 rounded-xl border p-5"
          >
            <h2 id="types-heading" className="font-medium">
              Column types
            </h2>
            <div
              className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              {COLUMN_TYPE_ORDER.filter(
                (type) => overview.columnTypeCounts[type] > 0,
              ).map((type) => (
                <span
                  key={type}
                  style={{
                    flexGrow: overview.columnTypeCounts[type],
                    background: COLUMN_TYPES[type].color,
                  }}
                />
              ))}
            </div>
            <ul className="space-y-2.5 text-sm">
              {COLUMN_TYPE_ORDER.filter(
                (type) => overview.columnTypeCounts[type] > 0,
              ).map((type) => {
                const { label, icon: Icon, color } = COLUMN_TYPES[type];
                return (
                  <li key={type} className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: color }}
                    />
                    <Icon
                      className="text-muted-foreground size-4"
                      aria-hidden="true"
                    />
                    <span className="flex-1">{label}</span>
                    <span className="font-mono tabular-nums">
                      {formatCount(overview.columnTypeCounts[type])}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            aria-labelledby="file-heading"
            className="bg-card space-y-4 rounded-xl border p-5"
          >
            <h2 id="file-heading" className="font-medium">
              How the file was read
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">File size</dt>
              <dd className="text-right font-mono tabular-nums">
                {formatBytes(source.sizeBytes)}
              </dd>
              <dt className="text-muted-foreground">In memory</dt>
              <dd className="text-right font-mono tabular-nums">
                {formatBytes(overview.memoryBytes)}
              </dd>
              <dt className="text-muted-foreground">Encoding</dt>
              <dd className="text-right">{encodingLabel(source.encoding)}</dd>
              <dt className="text-muted-foreground">Delimiter</dt>
              <dd className="text-right">{delimiterLabel(source.delimiter)}</dd>
              <dt className="text-muted-foreground">Analyzed</dt>
              <dd className="text-right">
                {formatDateTime(report.generatedAt)}
              </dd>
            </dl>
            {source.skippedLineCount > 0 && (
              <p className="bg-warning-soft text-warning flex gap-2 rounded-lg px-3 py-2.5 text-sm">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {formatCount(source.skippedLineCount)} malformed{' '}
                  {source.skippedLineCount === 1 ? 'line was' : 'lines were'}{' '}
                  skipped while reading the file.
                </span>
              </p>
            )}
          </section>
        </div>

        <section
          aria-labelledby="top-insights-heading"
          className="bg-card rounded-xl border p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="top-insights-heading" className="font-medium">
              Top insights
            </h2>
            {insights.length > TOP_INSIGHTS && (
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={onShowInsights}
              >
                See all {formatCount(insights.length)}
              </Button>
            )}
          </div>
          {insights.length === 0 ? (
            <p className="text-muted-foreground py-6 text-sm">
              No issues found. The data looks consistent.
            </p>
          ) : (
            <div className="divide-y">
              {insights.slice(0, TOP_INSIGHTS).map((insight) => (
                <InsightCard
                  key={`${insight.rule}-${insight.title}`}
                  insight={insight}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
