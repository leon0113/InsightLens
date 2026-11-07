import { ZodError } from 'zod';
import { IGenericErrorResponse } from '../interfaces/common';

const handleZodError = (error: ZodError): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Validation Error',
  errorMessages: error.issues.map((issue) => ({
    path: issue.path[issue.path.length - 1],
    message: issue.message,
  })),
});

export default handleZodError;
