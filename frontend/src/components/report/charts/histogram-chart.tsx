'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistogramBin } from '@/lib/api/types';
import { niceTicks } from '@/lib/chart';
import { formatCompact, formatCount, formatNumber } from '@/lib/format';
import {
  AXIS_LINE,
  AXIS_TICK,
  ChartTooltipBox,
  GRID_STROKE,
} from './chart-tooltip';

type Marker = { label: string; value: number; dashed?: boolean };

type HistogramChartProps = {
  bins: HistogramBin[];
  markers?: Marker[];
  height?: number;
  label: string;
};

/**
 * One numeric x axis from the first bin's start to the last bin's end. Each
 * bar sits at its bin's midpoint; with equal-width bins Recharts makes every
 * bar as wide as the gap between midpoints, so bars cover their ranges and the
 * mean and median lines land at their true values.
 */
export function HistogramChart({
  bins,
  markers = [],
  height = 220,
  label,
}: HistogramChartProps) {
  const start = bins[0]!.start;
  const end = bins.at(-1)!.end;
  const data = bins.map((bin) => ({ ...bin, mid: (bin.start + bin.end) / 2 }));
  const singleValue = start === end;
  const visibleMarkers = markers.filter(
    (marker) => marker.value >= start && marker.value <= end,
  );

  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          barCategoryGap={1}
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          {singleValue ? (
            // Every value is the same: one bar, labelled with that value.
            <XAxis
              dataKey="mid"
              tickFormatter={(value: number) => formatNumber(value)}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
          ) : (
            <XAxis
              dataKey="mid"
              type="number"
              domain={[start, end]}
              ticks={niceTicks(start, end)}
              tickFormatter={(value: number) => formatCompact(value)}
              allowDataOverflow
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
          )}
          <YAxis
            width={44}
            allowDecimals={false}
            tickFormatter={(value: number) => formatCompact(value)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const bin = payload?.[0]?.payload as HistogramBin | undefined;
              if (!active || !bin) return null;
              return (
                <ChartTooltipBox
                  title={
                    bin.start === bin.end
                      ? formatNumber(bin.start)
                      : `${formatNumber(bin.start)} to ${formatNumber(bin.end)}`
                  }
                >
                  {formatCount(bin.count)} {bin.count === 1 ? 'row' : 'rows'}
                </ChartTooltipBox>
              );
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--chart-1)"
            fillOpacity={0.88}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          {!singleValue &&
            visibleMarkers.map((marker) => (
              <ReferenceLine
                key={marker.label}
                x={marker.value}
                stroke="var(--foreground)"
                strokeWidth={1.5}
                strokeDasharray={marker.dashed ? '4 3' : undefined}
                ifOverflow="hidden"
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The key for the lines drawn on a histogram. */
export function MarkerLegend({ markers }: { markers: Marker[] }) {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {markers.map((marker) => (
        <li key={marker.label} className="flex items-center gap-1.5">
          <svg
            width="16"
            height="2"
            aria-hidden="true"
            className="overflow-visible"
          >
            <line
              x1="0"
              x2="16"
              y1="1"
              y2="1"
              stroke="var(--foreground)"
              strokeWidth="1.5"
              strokeDasharray={marker.dashed ? '4 3' : undefined}
            />
          </svg>
          {marker.label}{' '}
          <span className="text-foreground font-mono tabular-nums">
            {formatNumber(marker.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type { Marker };
