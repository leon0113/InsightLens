import { z } from 'zod';

const reportByDatasetSchema = z.object({
  params: z.object({
    datasetId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid dataset id'),
  }),
});

const demoReportSchema = z.object({
  params: z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Invalid demo name'),
  }),
});

export const ReportValidation = {
  reportByDatasetSchema,
  demoReportSchema,
};
