import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** A centred message for a view with nothing to show yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: StateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <span className="bg-primary-soft text-primary-strong flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-base font-medium">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** A failed request: what went wrong, and a way to try again. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border px-6 py-14 text-center',
        className,
      )}
    >
      <span className="bg-critical-soft text-critical flex size-11 items-center justify-center rounded-full">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
