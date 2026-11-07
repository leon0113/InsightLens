import httpStatus from 'http-status';
import { MulterError } from 'multer';
import { MAX_UPLOAD_MB } from '../helpers/fileUploadHelpers';
import { IGenericErrorResponse } from '../interfaces/common';

const handleMulterError = (error: MulterError): IGenericErrorResponse => {
  const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
  const message = isTooLarge
    ? `The file is larger than the ${MAX_UPLOAD_MB}MB limit`
    : error.message;

  return {
    statusCode: isTooLarge
      ? httpStatus.REQUEST_ENTITY_TOO_LARGE
      : httpStatus.BAD_REQUEST,
    message,
    errorMessages: [{ path: error.field ?? '', message }],
  };
};

export default handleMulterError;
