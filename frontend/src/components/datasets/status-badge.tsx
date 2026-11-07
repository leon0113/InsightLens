import type { DatasetStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STATUS: Record<DatasetStatus, { label: string; className: string }> = {
  processing: {
    label: 'Analyzing',
    className: 'bg-info-soft text-info [&>span]:animate-pulse',
  },
  ready: { label: 'Ready', className: 'bg-primary-soft text-primary-strong' },
  failed: { label: 'Failed', className: 'bg-critical-soft text-critical' },
};

export function StatusBadge({ status }: { status: DatasetStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-medium whitespace-nowrap',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
