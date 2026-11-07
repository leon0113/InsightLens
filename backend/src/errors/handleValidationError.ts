import mongoose from 'mongoose';
import { IGenericErrorResponse } from '../interfaces/common';

const handleValidationError = (
  error: mongoose.Error.ValidationError,
): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Validation Error',
  errorMessages: Object.values(error.errors).map((el) => ({
    path: el.path,
    message: el.message,
  })),
});

export default handleValidationError;
