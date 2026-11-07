import { Grid3x3 } from 'lucide-react';
import { EmptyState } from '@/components/states';
import type { Correlations, Sampling } from '@/lib/api/types';
import { formatCorrelation, formatCount } from '@/lib/format';
import { SamplingNote } from '../sampling-note';

// Above this many columns the numbers no longer fit in the cells; colors and
// tooltips still carry the values.
const MAX_LABELLED_COLUMNS = 12;

// The strongest cell is half color, half card, so the normal text color keeps
// a contrast of at least 4.5:1 on every cell in both themes.
const MAX_MIX_PERCENT = 50;

/** Diverging scale: rust for negative r, the card color at zero, petrol for positive. */
export function correlationColor(r: number | null): string {
  if (r === null) return 'var(--muted)';
  const strength = Math.round(Math.min(Math.abs(r), 1) * MAX_MIX_PERCENT);
  const hue = r >= 0 ? 'var(--chart-1)' : 'var(--chart-negative)';
  return `color-mix(in oklch, ${hue} ${strength}%, var(--card))`;
}

/** Plain words for r; near zero there is no direction worth naming. */
export function describeCorrelation(r: number): string {
  if (Math.abs(r) < 0.1) return 'Little or no linear relationship';
  return r > 0 ? 'Rise together' : 'Move in opposite directions';
}

export function CorrelationsTab({
  correlations,
  sampling,
}: {
  correlations: Correlations;
  sampling: Sampling;
}) {
  const { columns, matrix, topPairs, omittedColumnCount } = correlations;

  if (columns.length < 2) {
    return (
      <EmptyState
        icon={Grid3x3}
        title="Not enough numeric columns"
        description="Correlations need at least two numeric columns that vary. This file has fewer."
      />
    );
  }

  const showValues = columns.length <= MAX_LABELLED_COLUMNS;

  return (
    <div className="space-y-6">
      <SamplingNote sampling={sampling} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="heatmap-heading"
          className="bg-card min-w-0 space-y-4 rounded-xl border p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="heatmap-heading" className="font-medium">
              Pearson correlation
            </h2>
            <ScaleLegend />
          </div>
          <div
            role="region"
            aria-label="Correlation matrix"
            tabIndex={0}
            className="focus-visible:ring-ring/50 overflow-x-auto rounded-md pb-2 outline-none focus-visible:ring-3"
          >
            <table className="border-separate border-spacing-[3px] text-xs">
              <caption className="sr-only">
                Correlation between each pair of numeric columns, from -1 to 1
              </caption>
              <thead>
                <tr>
                  <td />
                  {columns.slice(0, -1).map((name) => (
                    <th
                      key={name}
                      scope="col"
                      className="relative h-28 min-w-9 font-normal"
                    >
                      <span
                        className="text-muted-foreground absolute bottom-1 left-1/2 block max-w-28 origin-bottom-left -rotate-45 truncate font-mono whitespace-nowrap"
                        title={name}
                      >
                        {name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Lower triangle without the diagonal: each pair appears once. */}
                {columns.slice(1).map((rowName, index) => {
                  const row = index + 1;
                  return (
                    <tr key={rowName}>
                      <th
                        scope="row"
                        className="text-muted-foreground max-w-36 truncate pr-2 text-right font-mono font-normal"
                        title={rowName}
                      >
                        {rowName}
                      </th>
                      {columns.slice(0, -1).map((columnName, column) => {
                        if (column >= row) return <td key={columnName} />;
                        const r = matrix[row]![column] ?? null;
                        return (
                          <td
                            key={columnName}
                            title={`${rowName} and ${columnName}: r = ${formatCorrelation(r)}`}
                            className="size-11 min-w-9 rounded-md text-center font-mono tabular-nums"
                            style={{ background: correlationColor(r) }}
                          >
                            {showValues ? (
                              formatCorrelation(r)
                            ) : (
                              <span className="sr-only">
                                {formatCorrelation(r)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {omittedColumnCount > 0 && (
            <p className="text-muted-foreground text-sm">
              {formatCount(omittedColumnCount)} more numeric{' '}
              {omittedColumnCount === 1 ? 'column is' : 'columns are'} left out
              to keep the matrix readable.
            </p>
          )}
        </section>

        <section
          aria-labelledby="pairs-heading"
          className="bg-card min-w-0 space-y-4 rounded-xl border p-5"
        >
          <h2 id="pairs-heading" className="font-medium">
            Strongest pairs
          </h2>
          <ol className="divide-y">
            {topPairs.map((pair) => (
              <li
                key={`${pair.columnA}-${pair.columnB}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3"
              >
                <p
                  className="truncate font-mono text-sm"
                  title={`${pair.columnA} and ${pair.columnB}`}
                >
                  {pair.columnA}{' '}
                  <span className="text-muted-foreground">and</span>{' '}
                  {pair.columnB}
                </p>
                <span
                  className="row-span-2 rounded-md px-2 py-1 font-mono text-sm font-medium tabular-nums"
                  style={{ background: correlationColor(pair.r) }}
                >
                  {formatCorrelation(pair.r)}
                </span>
                <p className="text-muted-foreground text-xs">
                  {describeCorrelation(pair.r)} across{' '}
                  {formatCount(pair.pairCount)} rows
                </p>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-xs leading-relaxed">
            A correlation shows that two columns move together, not that one
            causes the other.
          </p>
        </section>
      </div>
    </div>
  );
}

function ScaleLegend() {
  return (
    <div
      className="text-muted-foreground flex items-center gap-2 font-mono text-xs"
      aria-hidden="true"
    >
      <span>-1</span>
      <span
        className="h-2 w-28 rounded-full"
        style={{
          background: `linear-gradient(to right, ${correlationColor(-1)}, var(--card) 50%, ${correlationColor(1)})`,
          boxShadow: 'inset 0 0 0 1px var(--border)',
        }}
      />
      <span>+1</span>
    </div>
  );
}
