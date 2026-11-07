import { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import handleCastError from '../../errors/handleCastError';
import handleMulterError from '../../errors/handleMulterError';
import handleValidationError from '../../errors/handleValidationError';
import handleZodError from '../../errors/handleZodError';
import { IGenericErrorMessage } from '../../interfaces/error';
import { errorLogger } from '../../shared/logger';

// Express identifies error middleware by its four arguments, so keep `next`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  errorLogger.error(err?.stack || String(err));

  let statusCode = 500;
  let message = 'Something went wrong';
  let errorMessages: IGenericErrorMessage[] = [];

  // Order matters. ApiError and ZodError extend Error, so the generic
  // `instanceof Error` check must stay last or they lose their status code.
  if (err instanceof ZodError) {
    ({ statusCode, message, errorMessages } = handleZodError(err));
  } else if (err?.name === 'ValidationError') {
    ({ statusCode, message, errorMessages } = handleValidationError(err));
  } else if (err?.name === 'CastError') {
    ({ statusCode, message, errorMessages } = handleCastError(err));
  } else if (err instanceof MulterError) {
    ({ statusCode, message, errorMessages } = handleMulterError(err));
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = [{ path: '', message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorMessages = [{ path: '', message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.NODE_ENV !== 'production' ? err?.stack : undefined,
  });
};

export default globalErrorHandler;
