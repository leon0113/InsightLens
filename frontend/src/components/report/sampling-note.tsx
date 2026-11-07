import { Info } from 'lucide-react';
import type { Sampling } from '@/lib/api/types';
import { formatCount } from '@/lib/format';

/** Shown wherever a chart is drawn from the sample rather than every row. */
export function SamplingNote({ sampling }: { sampling: Sampling }) {
  if (!sampling.used) return null;
  return (
    <p className="bg-info-soft text-info flex gap-2 rounded-lg px-3 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Charts and correlations use a random sample of{' '}
        <span className="font-mono tabular-nums">
          {formatCount(sampling.sampledRows)}
        </span>{' '}
        of{' '}
        <span className="font-mono tabular-nums">
          {formatCount(sampling.totalRows)}
        </span>{' '}
        rows. All other statistics use every row.
      </span>
    </p>
  );
}
