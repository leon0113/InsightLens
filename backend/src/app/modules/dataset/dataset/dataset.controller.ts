import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../../constants/paginationConst';
import catchAsync from '../../../../shared/catchAsync';
import pick from '../../../../shared/pick';
import sendResponse from '../../../../shared/sendResponse';
import { DatasetService } from './dataset.service';

const uploadDataset = catchAsync(async (req: Request, res: Response) => {
  const result = await DatasetService.uploadDataset(req.file, req.user._id);

  // 202: the upload is accepted, and the analysis finishes later.
  sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    success: true,
    message: 'Upload received. The analysis has started.',
    data: result,
  });
});

const getAllDatasets = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'status']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await DatasetService.getAllDatasets(
    req.user._id,
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Datasets retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getDatasetById = catchAsync(async (req: Request, res: Response) => {
  const result = await DatasetService.getDatasetById(
    req.params.id,
    req.user._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dataset retrieved successfully',
    data: result,
  });
});

const deleteDataset = catchAsync(async (req: Request, res: Response) => {
  await DatasetService.deleteDataset(req.params.id, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dataset deleted successfully',
    data: null,
  });
});

export const DatasetController = {
  uploadDataset,
  getAllDatasets,
  getDatasetById,
  deleteDataset,
};
