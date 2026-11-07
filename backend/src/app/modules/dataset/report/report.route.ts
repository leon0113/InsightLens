import express from 'express';
import { isAuth } from '../../../middlewares/isAuth.middleware';
import validationRequest from '../../../middlewares/validationRequest';
import { ReportController } from './report.controller';
import { ReportValidation } from './report.validation';

const router = express.Router();

// Public: the demo routes let visitors try the app without an account.
// They are declared before /:datasetId, which would otherwise match "demo".
router.get('/demo', ReportController.getDemoDatasets);
router.get(
  '/demo/:slug',
  validationRequest(ReportValidation.demoReportSchema),
  ReportController.getDemoReport,
);
router.get(
  '/:datasetId',
  isAuth(),
  validationRequest(ReportValidation.reportByDatasetSchema),
  ReportController.getReportByDatasetId,
);

export const ReportRoutes = router;
