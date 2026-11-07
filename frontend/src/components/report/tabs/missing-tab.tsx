import { CircleCheck } from 'lucide-react';
import { EmptyState } from '@/components/states';
import type { Insight, Missing, Overview, Severity } from '@/lib/api/types';
import { formatCount, formatPercent } from '@/lib/format';

// Bars take the severity the engine gave the column's missing-rate insight,
// so the colors always agree with the Insights tab.
const BAR_COLOR: Record<Severity | 'none', string> = {
  critical: 'var(--critical)',
  warning: 'var(--warning)',
  info: 'var(--chart-1)',
  none: 'var(--chart-1)',
};

export function MissingTab({
  missing,
  overview,
  insights,
}: {
  missing: Missing;
  overview: Overview;
  insights: Insight[];
}) {
  const severityByColumn = new Map(
    insights
      .filter((insight) => insight.rule === 'high_missing_rate')
      .map((insight) => [insight.columns[0], insight.severity]),
  );
  const completeColumns = overview.columnCount - missing.columnsWithMissing;

  const summary = [
    {
      label: 'Missing cells',
      value: formatPercent(overview.missingPercent),
      detail: `${formatCount(overview.missingCellCount)} cells`,
    },
    {
      label: 'Columns with gaps',
      value: formatCount(missing.columnsWithMissing),
      detail: `of ${formatCount(overview.columnCount)} columns`,
    },
    {
      label: 'Complete rows',
      value: formatPercent(missing.completeRowPercent),
      detail: `${formatCount(missing.completeRowCount)} rows have every value`,
    },
  ];

  return (
    <div className="space-y-6">
      <dl className="bg-card grid rounded-xl border sm:grid-cols-3">
        {summary.map((item, index) => (
          <div
            key={item.label}
            className={
              index > 0
                ? 'space-y-1 border-t px-5 py-4 sm:border-t-0 sm:border-l'
                : 'space-y-1 px-5 py-4'
            }
          >
            <dt className="text-muted-foreground text-sm">{item.label}</dt>
            <dd className="font-mono text-2xl font-medium tabular-nums">
              {item.value}
            </dd>
            <dd className="text-muted-foreground text-xs">{item.detail}</dd>
          </div>
        ))}
      </dl>

      {missing.byColumn.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="No missing values"
          description="Every column has a value in every row."
        />
      ) : (
        <section
          aria-labelledby="missing-heading"
          className="bg-card space-y-5 rounded-xl border p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="missing-heading" className="font-medium">
              Missing values by column
            </h2>
            <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <li className="flex items-center gap-1.5">
                <span
                  className="bg-critical size-2.5 rounded-[3px]"
                  aria-hidden="true"
                />
                Critical
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="bg-warning size-2.5 rounded-[3px]"
                  aria-hidden="true"
                />
                Warning
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="bg-chart-1 size-2.5 rounded-[3px]"
                  aria-hidden="true"
                />
                Below the warning level
              </li>
            </ul>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">
              Missing values for each column that has any
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Column</th>
                <th scope="col">Share missing</th>
                <th scope="col">Missing cells</th>
              </tr>
            </thead>
            <tbody>
              {missing.byColumn.map((column) => (
                <tr key={column.name}>
                  <th
                    scope="row"
                    className="w-32 max-w-32 truncate py-1.5 pr-3 text-left font-mono text-xs font-normal sm:w-48 sm:max-w-48"
                    title={column.name}
                  >
                    {column.name}
                  </th>
                  <td className="py-1.5">
                    <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(column.missingPercent, 0.5)}%`,
                          background:
                            BAR_COLOR[
                              severityByColumn.get(column.name) ?? 'none'
                            ],
                        }}
                      />
                    </div>
                  </td>
                  <td className="w-36 py-1.5 pl-3 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                    {formatPercent(column.missingPercent)}
                    <span className="text-muted-foreground">
                      {' '}
                      · {formatCount(column.missingCount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {completeColumns > 0 && (
            <p className="text-muted-foreground text-sm">
              The other {formatCount(completeColumns)}{' '}
              {completeColumns === 1 ? 'column has' : 'columns have'} no missing
              values.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
