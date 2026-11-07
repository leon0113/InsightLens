'use client';

import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/states';
import type { Insight, Severity } from '@/lib/api/types';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { InsightCard } from '../insight-card';

type Filter = 'all' | Severity;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

export function InsightsTab({ insights }: { insights: Insight[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="No issues found"
        description="None of the checks found a problem: no high missing rates, outliers, skew, duplicates or suspicious columns."
      />
    );
  }

  const countFor = (value: Filter) =>
    value === 'all'
      ? insights.length
      : insights.filter((i) => i.severity === value).length;
  const visible =
    filter === 'all' ? insights : insights.filter((i) => i.severity === filter);

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filter by severity"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.filter((f) => countFor(f.value) > 0).map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
              filter === f.value
                ? 'border-foreground bg-foreground text-background'
                : 'bg-card hover:bg-accent',
            )}
          >
            {f.label}
            <span className="font-mono text-xs tabular-nums opacity-70">
              {formatCount(countFor(f.value))}
            </span>
          </button>
        ))}
      </div>
      <h2 className="sr-only">Insights</h2>
      <div className="bg-card divide-y rounded-xl border px-5">
        {visible.map((insight) => (
          <InsightCard
            key={`${insight.rule}-${insight.title}`}
            insight={insight}
          />
        ))}
      </div>
    </div>
  );
}
