import mongoose from 'mongoose';
import { IGenericErrorResponse } from '../interfaces/common';

const handleCastError = (
  error: mongoose.Error.CastError,
): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Cast Error',
  errorMessages: [{ path: error.path, message: 'Invalid Id' }],
});

export default handleCastError;
