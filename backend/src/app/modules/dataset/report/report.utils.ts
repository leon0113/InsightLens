import httpStatus from 'http-status';
import path from 'path';
import config from '../../../../config';
import ApiError from '../../../../errors/ApiError';
import { runAnalysis } from '../../../../helpers/analysisRunner';
import { IAnalysisReport } from '../../../../helpers/reportSchema';
import { errorLogger } from '../../../../shared/logger';
import { IDemoDataset } from './report.interface';

export const DEMO_DATASETS: IDemoDataset[] = [
  {
    slug: 'ecommerce-orders',
    title: 'E-commerce orders',
    description:
      'Two years of online store orders with mixed date formats, duplicate rows and prices that are not numbers.',
    fileName: 'ecommerce_orders.csv',
  },
  {
    slug: 'clinic-appointments',
    title: 'Clinic appointments',
    description:
      'A year of outpatient visits with placeholder ages, a constant column and a skewed waiting time.',
    fileName: 'clinic_appointments.csv',
  },
  {
    slug: 'sensor-readings',
    title: 'Factory sensor readings',
    description:
      'A semicolon-separated sensor log with error codes, malformed lines and strongly linked measurements.',
    fileName: 'sensor_readings.csv',
  },
];

let demoReports: Promise<Map<string, IAnalysisReport>> | null = null;

const buildDemoReports = async () => {
  const entries = await Promise.all(
    DEMO_DATASETS.map(async (demo) => {
      const filePath = path.join(config.sample_data_dir, demo.fileName);
      const result = await runAnalysis(filePath);
      if (!result.ok) {
        throw new Error(`Demo "${demo.slug}" failed: ${result.message}`);
      }
      return [demo.slug, result.report] as const;
    }),
  );
  return new Map(entries);
};

// The sample files never change, so each report is built once per server
// start and kept in memory. A failed build is retried on the next request.
export const getDemoReports = async () => {
  if (!demoReports) {
    demoReports = buildDemoReports();
  }
  try {
    return await demoReports;
  } catch (error) {
    demoReports = null;
    errorLogger.error(`Could not build demo reports: ${String(error)}`);
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'The demo reports are not available right now',
    );
  }
};
