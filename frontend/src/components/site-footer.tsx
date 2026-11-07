import { LogoMark } from '@/components/logo';

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="text-primary size-5" />
          <span className="text-foreground font-medium">InsightLens</span>
          <span>A portfolio project by Leon</span>
        </div>
        <p>Built with Next.js, Express, MongoDB and pandas.</p>
      </div>
    </footer>
  );
}
