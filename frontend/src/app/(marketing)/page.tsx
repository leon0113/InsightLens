import {
  ArrowRight,
  ChartColumn,
  CircleDashed,
  Columns3,
  Grid3x3,
  LayoutDashboard,
  Lightbulb,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { ReportPreview } from '@/components/landing/report-preview';
import { Button } from '@/components/ui/button';
import { DEMO_DATASETS, DEMO_PATH, demoPath } from '@/lib/routes';

const REPORT_SECTIONS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'Overview',
    text: 'Rows, columns, memory, duplicate rows and the share of empty cells.',
  },
  {
    icon: Lightbulb,
    title: 'Insights',
    text: 'Problems worth checking, ranked by severity, each with the numbers behind it.',
  },
  {
    icon: Columns3,
    title: 'Column profiles',
    text: 'The detected type of every column, with statistics that fit that type.',
  },
  {
    icon: CircleDashed,
    title: 'Missing values',
    text: 'Which columns have gaps, how large they are and how many rows are complete.',
  },
  {
    icon: ChartColumn,
    title: 'Distributions',
    text: 'Histograms with mean and median, and a focused view when outliers stretch the scale.',
  },
  {
    icon: Grid3x3,
    title: 'Correlations',
    text: 'A heatmap of Pearson correlations and the pairs that move together most.',
  },
  {
    icon: Table2,
    title: 'Data preview',
    text: 'The first 100 rows as they were read, to check the parsing at a glance.',
  },
];

const STEPS = [
  {
    title: 'Upload a CSV',
    text: 'Drop a file of up to 50 MB. The delimiter and text encoding are detected for you.',
  },
  {
    title: 'The engine profiles it',
    text: 'A Python engine built on pandas reads every column. Files over 200,000 rows use a fixed random sample for charts and correlations.',
  },
  {
    title: 'Read the report',
    text: 'Start with the findings, then open any column to see its distribution and statistics.',
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="space-y-7">
          <p className="text-primary text-sm font-medium">
            Exploratory data analysis, automated
          </p>
          <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Understand a CSV before you analyze it.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
            InsightLens profiles every column, measures missing values,
            outliers, skew and correlations, and explains each finding in plain
            English. One upload, one report.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <Link href={DEMO_PATH}>
                Explore a live demo
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 px-5 text-[15px]"
            >
              <Link href="/register">Analyze your own CSV</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            The demo needs no account.
          </p>
        </div>
        <ReportPreview />
      </section>

      <section aria-labelledby="report-heading" className="bg-card border-y">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2
              id="report-heading"
              className="font-heading text-3xl font-semibold tracking-tight"
            >
              Seven views of the same file
            </h2>
            <p className="text-muted-foreground text-lg">
              Every report has the same structure, so you always know where to
              look.
            </p>
          </div>
          <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_SECTIONS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="bg-primary-soft text-primary-strong flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6"
      >
        <h2
          id="how-heading"
          className="font-heading text-3xl font-semibold tracking-tight"
        >
          How it works
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="space-y-3 border-t pt-6">
              <span className="text-primary font-mono text-sm font-medium">
                Step {index + 1}
              </span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="demo-heading" className="bg-card border-y">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2
              id="demo-heading"
              className="font-heading text-3xl font-semibold tracking-tight"
            >
              Try it on sample data
            </h2>
            <p className="text-muted-foreground text-lg">
              Three synthetic datasets, generated for this demo, each with the
              kind of problems real files have.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {DEMO_DATASETS.map((dataset) => (
              <li key={dataset.slug}>
                <Link
                  href={demoPath(dataset.slug)}
                  className="group bg-background hover:border-primary/60 flex h-full flex-col gap-3 rounded-xl border p-5 transition-colors"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {dataset.fileName}
                  </span>
                  <span className="text-lg font-medium">{dataset.title}</span>
                  <span className="text-muted-foreground flex-1 text-sm leading-relaxed">
                    {dataset.description}
                  </span>
                  <span className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
                    Open the report
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
