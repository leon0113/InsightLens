import { SeverityBadge } from '@/components/severity-badge';
import type { Insight } from '@/lib/api/types';
import { formatMetric } from './labels';

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="flex gap-3 py-4 sm:gap-4">
      <SeverityBadge severity={insight.severity} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="font-medium">{insight.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {insight.message}
        </p>
        {(insight.columns.length > 0 || insight.metrics.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5 text-xs">
            {insight.columns.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Columns">
                {insight.columns.map((column) => (
                  <li
                    key={column}
                    className="bg-muted rounded-md px-1.5 py-0.5 font-mono"
                  >
                    {column}
                  </li>
                ))}
              </ul>
            )}
            {insight.metrics.length > 0 && (
              <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                {insight.metrics.map((metric) => (
                  <div key={metric.label} className="flex gap-1.5">
                    <dt>{metric.label}</dt>
                    <dd className="text-foreground font-mono font-medium tabular-nums">
                      {formatMetric(metric)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
