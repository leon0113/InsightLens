import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { DEMO_PATH } from '@/lib/routes';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main
        id="main"
        className="flex flex-1 items-start justify-center px-4 pt-10 pb-16 sm:items-center sm:pt-0"
      >
        <div className="bg-card w-full max-w-sm rounded-2xl border p-6 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.15)] sm:p-8">
          {children}
        </div>
      </main>
      <footer className="text-muted-foreground pb-8 text-center text-sm">
        Just looking?{' '}
        <Link
          href={DEMO_PATH}
          className="text-primary rounded-sm font-medium hover:underline"
        >
          Open a demo report
        </Link>
      </footer>
    </div>
  );
}
