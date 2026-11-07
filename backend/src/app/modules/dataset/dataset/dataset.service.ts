import httpStatus from 'http-status';
import mongoose, { FilterQuery, SortOrder, Types } from 'mongoose';
import ApiError from '../../../../errors/ApiError';
import {
  GENERIC_FAILURE,
  IAnalysisResult,
  runAnalysis,
} from '../../../../helpers/analysisRunner';
import { FileUploadHelper } from '../../../../helpers/fileUploadHelpers';
import { paginationHelper } from '../../../../helpers/paginationHelper';
import { IAnalysisReport } from '../../../../helpers/reportSchema';
import { IGenericPaginationResponse } from '../../../../interfaces/common';
import { IPaginationOptions } from '../../../../interfaces/paginationType';
import escapeRegex from '../../../../shared/escapeRegex';
import { errorLogger } from '../../../../shared/logger';
import { Report } from '../report/report.model';
import { DATASET_STATUS, IDataset, IDatasetFilters } from './dataset.interface';
import { Dataset } from './dataset.model';

const MAX_NAME_LENGTH = 255;
const INTERRUPTED_MESSAGE =
  'The analysis was interrupted by a server restart. Please upload the file again.';

// Saves the report and marks the dataset ready in one transaction, so a dataset
// is never "ready" without a report. If the user deleted the dataset while it
// was being analyzed, nothing is saved.
const saveReport = async (
  datasetId: Types.ObjectId,
  owner: Types.ObjectId,
  report: IAnalysisReport,
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const dataset = await Dataset.findOneAndUpdate(
      { _id: datasetId, status: DATASET_STATUS.PROCESSING },
      {
        status: DATASET_STATUS.READY,
        rowCount: report.overview.rowCount,
        columnCount: report.overview.columnCount,
      },
      { session, new: true },
    );
    if (dataset) {
      await Report.create([{ dataset: datasetId, owner, content: report }], {
        session,
      });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const markFailed = async (datasetId: Types.ObjectId, message: string) => {
  await Dataset.updateOne(
    { _id: datasetId, status: DATASET_STATUS.PROCESSING },
    { status: DATASET_STATUS.FAILED, errorMessage: message },
  );
};

// Runs after the upload response has been sent. It must never throw, because
// nothing is waiting to catch the error and the server would stop.
// The file is deleted before the status changes, so once a client sees the
// final status, the CSV is already gone.
const analyzeDataset = async (
  datasetId: Types.ObjectId,
  owner: Types.ObjectId,
  filePath: string,
) => {
  let result: IAnalysisResult;
  try {
    result = await runAnalysis(filePath);
  } finally {
    await FileUploadHelper.deleteFile(filePath);
  }

  try {
    if (result.ok) {
      await saveReport(datasetId, owner, result.report);
    } else {
      await markFailed(datasetId, result.message);
    }
  } catch (error) {
    errorLogger.error(
      `Saving analysis for ${datasetId} failed: ${String(error)}`,
    );
    await markFailed(datasetId, GENERIC_FAILURE).catch(() => undefined);
  }
};

const uploadDataset = async (
  file: Express.Multer.File | undefined,
  owner: Types.ObjectId,
) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A CSV file is required');
  }

  let dataset;
  try {
    dataset = await Dataset.create({
      name: file.originalname.slice(0, MAX_NAME_LENGTH),
      sizeBytes: file.size,
      owner,
    });
  } catch (error) {
    await FileUploadHelper.deleteFile(file.path);
    throw error;
  }

  void analyzeDataset(dataset._id, owner, file.path);
  return dataset;
};

const getAllDatasets = async (
  owner: Types.ObjectId,
  filters: IDatasetFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericPaginationResponse<IDataset[]>> => {
  const { searchTerm, status } = filters;
  const where: FilterQuery<IDataset> = { owner };

  if (searchTerm) {
    where.name = { $regex: escapeRegex(searchTerm), $options: 'i' };
  }
  if (status) {
    where.status = status;
  }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);
  const sortConditions: { [key: string]: SortOrder } = { [sortBy]: sortOrder };

  const data = await Dataset.find(where)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);
  const total = await Dataset.countDocuments(where);

  return { meta: { page, limit, total }, data };
};

// Another user's dataset gives the same 404 as a missing one, so ids cannot be probed.
const getDatasetById = async (id: string, owner: Types.ObjectId) => {
  const dataset = await Dataset.findOne({ _id: id, owner });
  if (!dataset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Dataset not found');
  }
  return dataset;
};

const deleteDataset = async (id: string, owner: Types.ObjectId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const dataset = await Dataset.findOneAndDelete(
      { _id: id, owner },
      { session },
    );
    if (!dataset) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Dataset not found');
    }
    await Report.deleteOne({ dataset: dataset._id }, { session });

    await session.commitTransaction();
    return dataset;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const failInterruptedDatasets = async () => {
  await Dataset.updateMany(
    { status: DATASET_STATUS.PROCESSING },
    { status: DATASET_STATUS.FAILED, errorMessage: INTERRUPTED_MESSAGE },
  );
};

export const DatasetService = {
  uploadDataset,
  getAllDatasets,
  getDatasetById,
  deleteDataset,
  failInterruptedDatasets,
};
