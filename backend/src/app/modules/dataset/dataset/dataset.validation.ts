import { z } from 'zod';
import { DATASET_STATUS } from './dataset.interface';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid dataset id');

const getDatasetsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.enum(['createdAt', 'name', 'sizeBytes']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().max(100).optional(),
    status: z.nativeEnum(DATASET_STATUS).optional(),
  }),
});

const datasetIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const DatasetValidation = {
  getDatasetsSchema,
  datasetIdSchema,
};
