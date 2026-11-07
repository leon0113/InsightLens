'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Report } from '@/lib/api/types';
import { formatBytes, formatCount } from '@/lib/format';
import { ColumnsTab } from './tabs/columns-tab';
import { CorrelationsTab } from './tabs/correlations-tab';
import { DistributionsTab } from './tabs/distributions-tab';
import { InsightsTab } from './tabs/insights-tab';
import { MissingTab } from './tabs/missing-tab';
import { OverviewTab } from './tabs/overview-tab';
import { PreviewTab } from './tabs/preview-tab';

export const REPORT_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'insights', label: 'Insights' },
  { value: 'columns', label: 'Columns' },
  { value: 'missing', label: 'Missing values' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'correlations', label: 'Correlations' },
  { value: 'preview', label: 'Data preview' },
] as const;

type TabValue = (typeof REPORT_TABS)[number]['value'];

const isTab = (value: string | null): value is TabValue =>
  REPORT_TABS.some((tab) => tab.value === value);

type ReportViewProps = {
  report: Report;
  title: string;
  eyebrow: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function ReportView({
  report,
  title,
  eyebrow,
  description,
  actions,
}: ReportViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  // The open tab lives in the URL, so a link or a refresh lands on the same tab.
  const requested = searchParams.get('tab');
  const tab: TabValue = isTab(requested) ? requested : 'overview';
  const selectTab = (value: string) => {
    const query = value === 'overview' ? '' : `?tab=${value}`;
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const { overview, sampling, insights } = report;
  const counts: Partial<Record<TabValue, number>> = {
    insights: insights.length,
    columns: overview.columnCount,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <header className="space-y-4">
        <div className="text-muted-foreground text-sm">{eyebrow}</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-all sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground max-w-2xl">{description}</p>
            )}
            <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="font-mono tabular-nums">
                {formatCount(overview.rowCount)} rows
              </span>
              <span className="font-mono tabular-nums">
                {formatCount(overview.columnCount)} columns
              </span>
              <span className="font-mono tabular-nums">
                {formatBytes(report.source.sizeBytes)}
              </span>
              <span>
                {sampling.used
                  ? `Charts from a ${formatCount(sampling.sampledRows)} row sample`
                  : 'Analyzed in full'}
              </span>
            </p>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>

      <Tabs value={tab} onValueChange={selectTab} className="mt-6 gap-6">
        <div className="-mx-4 [scrollbar-width:none] overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
          <TabsList variant="line" className="h-auto gap-1 p-0">
            {REPORT_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-active:after:bg-primary flex-none px-2.5 pt-2 pb-3 text-sm group-data-horizontal/tabs:after:bottom-0"
              >
                {label}
                {counts[value] !== undefined && (
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {formatCount(counts[value])}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={tab} asChild>
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'overview' && (
              <OverviewTab
                report={report}
                onShowInsights={() => selectTab('insights')}
              />
            )}
            {tab === 'insights' && <InsightsTab insights={insights} />}
            {tab === 'columns' && <ColumnsTab columns={report.columns} />}
            {tab === 'missing' && (
              <MissingTab
                missing={report.missing}
                overview={overview}
                insights={insights}
              />
            )}
            {tab === 'distributions' && <DistributionsTab report={report} />}
            {tab === 'correlations' && (
              <CorrelationsTab
                correlations={report.correlations}
                sampling={sampling}
              />
            )}
            {tab === 'preview' && <PreviewTab preview={report.preview} />}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
