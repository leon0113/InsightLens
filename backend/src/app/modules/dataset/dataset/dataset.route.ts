import express from 'express';
import { FileUploadHelper } from '../../../../helpers/fileUploadHelpers';
import { isAuth } from '../../../middlewares/isAuth.middleware';
import { uploadRateLimit } from '../../../middlewares/uploadRateLimit';
import validationRequest from '../../../middlewares/validationRequest';
import { DatasetController } from './dataset.controller';
import { DatasetValidation } from './dataset.validation';

const router = express.Router();

// The rate limit runs before Multer, so a rejected upload never reaches the disk.
router.post(
  '/',
  isAuth(),
  uploadRateLimit,
  FileUploadHelper.upload.single('file'),
  DatasetController.uploadDataset,
);
router.get(
  '/',
  isAuth(),
  validationRequest(DatasetValidation.getDatasetsSchema),
  DatasetController.getAllDatasets,
);
router.get(
  '/:id',
  isAuth(),
  validationRequest(DatasetValidation.datasetIdSchema),
  DatasetController.getDatasetById,
);
router.delete(
  '/:id',
  isAuth(),
  validationRequest(DatasetValidation.datasetIdSchema),
  DatasetController.deleteDataset,
);

export const DatasetRoutes = router;
