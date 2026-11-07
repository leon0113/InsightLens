import type { ReactNode } from 'react';

/** The one tooltip look shared by every chart. */
export function ChartTooltipBox({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-0.5 font-mono">{title}</p>
      <p className="font-mono font-medium tabular-nums">{children}</p>
    </div>
  );
}

// Shared Recharts styling, so no chart falls back to library defaults.
export const AXIS_TICK = {
  fill: 'var(--muted-foreground)',
  fontSize: 11,
  fontFamily: 'var(--font-plex-mono), monospace',
};

export const AXIS_LINE = { stroke: 'var(--border)' };

export const GRID_STROKE = 'var(--chart-grid)';
