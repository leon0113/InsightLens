'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/datasets', label: 'Datasets' },
  { href: '/upload', label: 'Upload' },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function UserMenu() {
  const { user, logOut } = useSession();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-primary-soft text-primary-strong hover:bg-primary-soft/80 rounded-full text-xs font-semibold"
          aria-label={`Account menu for ${user.name}`}
        >
          {initials(user.name) || '?'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-foreground truncate text-sm font-medium">
            {user.name}
          </p>
          <p className="text-muted-foreground truncate text-xs font-normal">
            {user.userId}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logOut()}>
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-4"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 transition-colors',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <main
        id="main"
        className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10 sm:px-6"
      >
        <h1 className="sr-only">Loading your account</h1>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    </div>
  );
}

/** Pages inside the app need a session; anyone else is sent to sign in. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status !== 'authenticated') {
    return <ShellSkeleton />;
  }

  return (
    <>
      <AppHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
