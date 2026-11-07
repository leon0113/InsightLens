import { Suspense } from 'react';
import { AppShell, ShellSkeleton } from '@/components/app/app-shell';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  // The shell reads the current path, which is only known per request.
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
