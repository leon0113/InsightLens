import httpStatus from 'http-status';
import { Types } from 'mongoose';
import ApiError from '../../../../errors/ApiError';
import { DATASET_STATUS } from '../dataset/dataset.interface';
import { Dataset } from '../dataset/dataset.model';
import { Report } from './report.model';
import { DEMO_DATASETS, getDemoReports } from './report.utils';

const getReportByDatasetId = async (
  datasetId: string,
  owner: Types.ObjectId,
) => {
  const dataset = await Dataset.findOne({ _id: datasetId, owner });
  if (!dataset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Dataset not found');
  }
  if (dataset.status === DATASET_STATUS.PROCESSING) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'The report is still being prepared',
    );
  }
  if (dataset.status === DATASET_STATUS.FAILED) {
    throw new ApiError(
      httpStatus.CONFLICT,
      dataset.errorMessage || 'The analysis of this dataset failed',
    );
  }

  const report = await Report.findOne({ dataset: dataset._id, owner });
  if (!report) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Report not found');
  }
  return { dataset, report: report.content };
};

const getDemoDatasets = async () => {
  const reports = await getDemoReports();
  return DEMO_DATASETS.map(({ slug, title, description, fileName }) => {
    const { overview, insights } = reports.get(slug)!;
    return {
      slug,
      title,
      description,
      name: fileName,
      rowCount: overview.rowCount,
      columnCount: overview.columnCount,
      insightCount: insights.length,
    };
  });
};

const getDemoReport = async (slug: string) => {
  const demo = DEMO_DATASETS.find((item) => item.slug === slug);
  if (!demo) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Demo report not found');
  }

  const reports = await getDemoReports();
  const { slug: demoSlug, title, description, fileName } = demo;
  return {
    dataset: { slug: demoSlug, title, description, name: fileName },
    report: reports.get(slug)!,
  };
};

// Builds the demo reports in the background at startup, so the first visitor
// does not wait. Errors are already logged, and the next request retries.
const preloadDemoReports = () => {
  getDemoReports().catch(() => undefined);
};

export const ReportService = {
  getReportByDatasetId,
  getDemoDatasets,
  getDemoReport,
  preloadDemoReports,
};
