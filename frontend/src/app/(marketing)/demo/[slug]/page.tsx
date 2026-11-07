import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DemoReport } from '@/components/report/demo-report';
import { ReportSkeleton } from '@/components/report/report-skeleton';
import { DEMO_DATASETS } from '@/lib/routes';

export function generateStaticParams() {
  return DEMO_DATASETS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/demo/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const demo = DEMO_DATASETS.find((item) => item.slug === slug);
  return { title: demo ? `${demo.title} demo` : 'Demo report' };
}

export default function DemoReportPage({ params }: PageProps<'/demo/[slug]'>) {
  return (
    <Suspense fallback={<ReportSkeleton label="Loading the demo report" />}>
      {params.then(({ slug }) => (
        <DemoReport slug={slug} />
      ))}
    </Suspense>
  );
}
