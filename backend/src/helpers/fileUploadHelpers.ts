import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import httpStatus from 'http-status';
import multer from 'multer';
import path from 'path';
import ApiError from '../errors/ApiError';
import { errorLogger } from '../shared/logger';

export const MAX_UPLOAD_MB = 50;
const UPLOAD_DIR = 'uploads';
const KEEP_FILE = '.gitkeep';

// Files get random names, so a user-supplied name never becomes a path on disk.
const upload = multer({
  storage: multer.diskStorage({
    destination: `${UPLOAD_DIR}/`,
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}.csv`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new ApiError(httpStatus.BAD_REQUEST, 'Only .csv files are accepted'));
    }
  },
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  // Without this, non-ASCII file names such as "café.csv" arrive garbled.
  defParamCharset: 'utf8',
});

// Never throws: it runs after background analysis, where an error would stop the server.
const deleteFile = async (filePath: string) => {
  try {
    await fs.rm(filePath, { force: true });
  } catch (error) {
    errorLogger.error(`Could not delete ${filePath}: ${String(error)}`);
  }
};

const clearUploadsFolder = async () => {
  const names = await fs.readdir(UPLOAD_DIR).catch(() => []);
  const leftovers = names.filter((name) => name !== KEEP_FILE);
  await Promise.all(
    leftovers.map((name) => deleteFile(path.join(UPLOAD_DIR, name))),
  );
};

export const FileUploadHelper = {
  upload,
  deleteFile,
  clearUploadsFolder,
};
