import type { Severity } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STYLES: Record<Severity, string> = {
  critical: 'bg-critical-soft text-critical',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

const LABELS: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center self-start rounded-md px-1.5 py-1 text-[11px] leading-none font-medium tracking-wide uppercase',
        STYLES[severity],
        className,
      )}
    >
      {LABELS[severity]}
    </span>
  );
}
