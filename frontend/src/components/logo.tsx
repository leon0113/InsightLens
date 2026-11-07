import Link from 'next/link';
import { cn } from '@/lib/utils';

/** A lens ring around three rising bars. Drawn in currentColor so it follows the theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect x="9.5" y="16" width="3.2" height="6" rx="1" fill="currentColor" />
      <rect
        x="14.4"
        y="12"
        width="3.2"
        height="10"
        rx="1"
        fill="currentColor"
      />
      <rect x="19.3" y="9" width="3.2" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'font-heading inline-flex items-center gap-2 rounded-md text-lg font-bold tracking-tight',
        className,
      )}
    >
      <LogoMark className="text-primary size-7" />
      InsightLens
    </Link>
  );
}
