import mongoose from 'mongoose';
import app from './app';
import { DatasetService } from './app/modules/dataset/dataset/dataset.service';
import { ReportService } from './app/modules/dataset/report/report.service';
import config from './config';
import { FileUploadHelper } from './helpers/fileUploadHelpers';
import { errorLogger, logger } from './shared/logger';

process.on('unhandledRejection', (reason) => {
  errorLogger.error(`Unhandled rejection: ${String(reason)}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  errorLogger.error(`Uncaught exception: ${err.stack}`);
  process.exit(1);
});

async function main() {
  try {
    await mongoose.connect(config.database_url);
    logger.info('Database connected');

    // Analyses do not survive a restart, so clean up any that were cut off.
    await DatasetService.failInterruptedDatasets();
    await FileUploadHelper.clearUploadsFolder();

    app.listen(config.port, () => {
      logger.info(`App listening on port ${config.port}`);
    });

    ReportService.preloadDemoReports();
  } catch (err) {
    errorLogger.error(`Failed to connect to database: ${String(err)}`);
    process.exit(1);
  }
}

main();
