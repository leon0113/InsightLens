'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompact, formatCount, formatMonth } from '@/lib/format';
import {
  AXIS_LINE,
  AXIS_TICK,
  ChartTooltipBox,
  GRID_STROKE,
} from './chart-tooltip';

type MonthCount = { month: string; count: number };

export function MonthlyChart({
  data,
  height = 200,
  label,
}: {
  data: MonthCount[];
  height?: number;
  label: string;
}) {
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="month"
            tickFormatter={(month: string) => formatMonth(month)}
            interval="preserveStartEnd"
            minTickGap={24}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
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
              const point = payload?.[0]?.payload as MonthCount | undefined;
              if (!active || !point) return null;
              return (
                <ChartTooltipBox title={formatMonth(point.month)}>
                  {formatCount(point.count)}{' '}
                  {point.count === 1 ? 'row' : 'rows'}
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
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
