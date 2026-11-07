import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../shared/catchAsync';
import sendResponse from '../../../../shared/sendResponse';
import { ReportService } from './report.service';

const getReportByDatasetId = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getReportByDatasetId(
    req.params.datasetId,
    req.user._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Report retrieved successfully',
    data: result,
  });
});

const getDemoDatasets = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getDemoDatasets();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Demo datasets retrieved successfully',
    data: result,
  });
});

const getDemoReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getDemoReport(req.params.slug);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Demo report retrieved successfully',
    data: result,
  });
});

export const ReportController = {
  getReportByDatasetId,
  getDemoDatasets,
  getDemoReport,
};
