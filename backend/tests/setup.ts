import mongoose from 'mongoose';
import { afterAll, beforeAll, inject } from 'vitest';
import { FileUploadHelper } from '../src/helpers/fileUploadHelpers';

// Set before the app is imported, because config reads the environment once.
process.env.DATABASE_URL = inject('mongoUri');
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.PYTHON_BIN = '../analysis-engine/.venv/Scripts/python.exe';
process.env.ANALYSIS_SCRIPT_PATH = '../analysis-engine/profile_dataset.py';
process.env.SAMPLE_DATA_DIR = '../sample-data';

// Empties each collection but keeps its indexes. Dropping the database instead
// can race with index creation and lose the unique index on email.
beforeAll(async () => {
  await FileUploadHelper.clearUploadsFolder();
  await mongoose.connect(process.env.DATABASE_URL as string);
  await Promise.all(
    Object.values(mongoose.connection.models).map(async (model) => {
      await model.init();
      await model.deleteMany({});
    }),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
});
