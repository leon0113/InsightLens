'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Column, ColumnType, ValueCount } from '@/lib/api/types';
import {
  formatCount,
  formatDate,
  formatNumber,
  formatPercent,
  MISSING_VALUE,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { HistogramChart } from '../charts/histogram-chart';
import { MonthlyChart } from '../charts/monthly-chart';
import { COLUMN_TYPE_ORDER, COLUMN_TYPES } from '../labels';

const INVALID_AS: Partial<Record<ColumnType, string>> = {
  numeric: 'a number',
  datetime: 'a date',
  boolean: 'a yes or no value',
};

export function ColumnsTab({ columns }: { columns: Column[] }) {
  const [typeFilter, setTypeFilter] = useState<ColumnType | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const typesPresent = COLUMN_TYPE_ORDER.filter((type) =>
    columns.some((column) => column.type === type),
  );
  const visible =
    typeFilter === 'all'
      ? columns
      : columns.filter((c) => c.type === typeFilter);

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filter by column type"
        className="flex flex-wrap gap-2"
      >
        {(['all', ...typesPresent] as const).map((type) => {
          const count =
            type === 'all'
              ? columns.length
              : columns.filter((c) => c.type === type).length;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
                'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
                typeFilter === type
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card hover:bg-accent',
              )}
            >
              {type === 'all' ? 'All' : COLUMN_TYPES[type].label}
              <span className="font-mono text-xs tabular-nums opacity-70">
                {formatCount(count)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="text-muted-foreground hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_repeat(2,minmax(0,1fr))_2rem] gap-4 border-b px-5 py-3 text-xs font-medium sm:grid">
          <span>Column</span>
          <span>Type</span>
          <span className="text-right">Missing</span>
          <span className="text-right">Distinct</span>
          <span />
        </div>
        <ul className="divide-y">
          {visible.map((column) => {
            const isOpen = open === column.name;
            const { label, icon: Icon } = COLUMN_TYPES[column.type];
            const panelId = `column-${column.name}`.replace(/[^\w-]/g, '_');
            return (
              <li key={column.name}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : column.name)}
                  className="hover:bg-accent/50 focus-visible:ring-ring/50 grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-inset sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_repeat(2,minmax(0,1fr))_2rem]"
                >
                  <span
                    className="truncate font-mono font-medium"
                    title={column.name}
                  >
                    {column.name}
                  </span>
                  <span className="text-muted-foreground col-start-1 row-start-2 flex items-center gap-1.5 sm:col-start-auto sm:row-start-auto">
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="hidden text-right font-mono tabular-nums sm:block">
                    {formatPercent(column.missingPercent)}
                  </span>
                  <span className="hidden text-right font-mono tabular-nums sm:block">
                    {formatCount(column.uniqueCount)}
                  </span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground col-start-2 row-span-2 row-start-1 size-4 justify-self-end transition-transform sm:col-start-auto sm:row-span-1 sm:row-start-auto',
                      isOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    className="bg-background/60 border-t px-5 py-5"
                  >
                    <ColumnDetail column={column} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-0.5">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="font-mono text-sm tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ColumnDetail({ column }: { column: Column }) {
  const common: [string, string][] = [
    [
      'Missing',
      `${formatCount(column.missingCount)} (${formatPercent(column.missingPercent)})`,
    ],
    [
      'Distinct values',
      `${formatCount(column.uniqueCount)} (${formatPercent(column.uniquePercent)})`,
    ],
  ];
  const invalidNote =
    column.invalidCount > 0 && INVALID_AS[column.type] ? (
      <p className="bg-warning-soft text-warning rounded-lg px-3 py-2 text-sm">
        {formatCount(column.invalidCount)}{' '}
        {column.invalidCount === 1 ? 'value' : 'values'} could not be read as{' '}
        {INVALID_AS[column.type]} and{' '}
        {column.invalidCount === 1 ? 'was' : 'were'} left out of the statistics.
      </p>
    ) : null;

  switch (column.type) {
    case 'numeric': {
      const s = column.stats;
      // Same default as the Distributions tab: outliers left out when they exist.
      const bins = s.focusedHistogram?.bins ?? s.histogram;
      return (
        <div className="space-y-5">
          {invalidNote}
          <StatGrid
            items={[
              ...common,
              ['Mean', formatNumber(s.mean)],
              ['Median', formatNumber(s.median)],
              ['Std. deviation', formatNumber(s.std)],
              ['Skewness', formatNumber(s.skewness, 4)],
              ['Min', formatNumber(s.min)],
              ['Max', formatNumber(s.max)],
              ['Q1 to Q3', `${formatNumber(s.q1)} to ${formatNumber(s.q3)}`],
              [
                'Outliers',
                `${formatCount(s.outliers.count)} (${formatPercent(s.outliers.percent)})`,
              ],
              [
                'Expected range',
                `${formatNumber(s.outliers.lowerFence)} to ${formatNumber(s.outliers.upperFence)}`,
              ],
            ]}
          />
          <div className="space-y-2">
            <HistogramChart
              bins={bins}
              height={180}
              markers={[
                { label: 'Mean', value: s.mean },
                { label: 'Median', value: s.median, dashed: true },
              ]}
              label={`Histogram of ${column.name} from ${formatNumber(bins[0]!.start)} to ${formatNumber(bins.at(-1)!.end)}`}
            />
            {s.focusedHistogram && (
              <p className="text-muted-foreground text-xs">
                Outliers are left out of this chart. The Distributions tab can
                show the full range.
              </p>
            )}
          </div>
        </div>
      );
    }
    case 'categorical':
      return (
        <div className="space-y-5">
          <StatGrid items={common} />
          <TopValues
            values={column.stats.topValues}
            otherCount={column.stats.otherCount}
          />
        </div>
      );
    case 'datetime': {
      const s = column.stats;
      return (
        <div className="space-y-5">
          {invalidNote}
          <StatGrid
            items={[
              ...common,
              ['Earliest', formatDate(s.min)],
              ['Latest', formatDate(s.max)],
              ['Span', `${formatCount(s.rangeDays)} days`],
            ]}
          />
          <MonthlyChart
            data={s.monthlyCounts}
            height={180}
            label={`Rows per month in ${column.name}, ${formatDate(s.min)} to ${formatDate(s.max)}`}
          />
        </div>
      );
    }
    case 'boolean': {
      const s = column.stats;
      return (
        <div className="space-y-5">
          {invalidNote}
          <StatGrid items={common} />
          <div className="space-y-2">
            <div
              className="flex h-3 gap-0.5 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <span className="bg-chart-1" style={{ flexGrow: s.trueCount }} />
              <span className="bg-chart-6" style={{ flexGrow: s.falseCount }} />
            </div>
            <div className="flex justify-between text-sm">
              <span>
                True{' '}
                <span className="font-mono tabular-nums">
                  {formatCount(s.trueCount)} ({formatPercent(s.truePercent)})
                </span>
              </span>
              <span>
                False{' '}
                <span className="font-mono tabular-nums">
                  {formatCount(s.falseCount)} (
                  {formatPercent(100 - s.truePercent)})
                </span>
              </span>
            </div>
          </div>
        </div>
      );
    }
    case 'text':
    case 'id': {
      const s = column.stats;
      return (
        <div className="space-y-5">
          <StatGrid
            items={[
              ...common,
              ['Shortest', `${formatCount(s.minLength)} characters`],
              ['Average length', `${formatNumber(s.meanLength, 1)} characters`],
              ['Longest', `${formatCount(s.maxLength)} characters`],
            ]}
          />
          {s.exampleValues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs">Examples</h3>
              <ul className="space-y-1.5">
                {s.exampleValues.map((value) => (
                  <li
                    key={value}
                    className="bg-muted rounded-md px-2.5 py-1.5 font-mono text-xs break-all"
                  >
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
  }
}

function TopValues({
  values,
  otherCount,
}: {
  values: ValueCount[];
  otherCount: number;
}) {
  if (values.length === 0) {
    return <p className="text-muted-foreground text-sm">{MISSING_VALUE}</p>;
  }
  const largest = values[0]!.percent;
  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs">Most common values</h3>
      <ul className="space-y-2">
        {values.map((item) => (
          <li
            key={item.value}
            className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
          >
            <span className="truncate font-mono text-xs" title={item.value}>
              {item.value}
            </span>
            <span className="bg-muted h-2 overflow-hidden rounded-full">
              <span
                className="bg-chart-1 block h-full rounded-full"
                style={{ width: `${(item.percent / largest) * 100}%` }}
              />
            </span>
            <span className="text-muted-foreground w-28 text-right font-mono text-xs tabular-nums">
              {formatCount(item.count)} · {formatPercent(item.percent)}
            </span>
          </li>
        ))}
      </ul>
      {otherCount > 0 && (
        <p className="text-muted-foreground text-xs">
          Plus {formatCount(otherCount)} {otherCount === 1 ? 'value' : 'values'}{' '}
          in other categories.
        </p>
      )}
    </div>
  );
}
