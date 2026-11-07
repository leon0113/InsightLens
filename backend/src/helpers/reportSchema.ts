import { z } from 'zod';

// Mirrors docs/report_schema.md. Change both together.

const count = z.number().int().nonnegative();
const percent = z.number().min(0).max(100);
const nullableNumber = z.number().nullable();
const valueCount = z.object({
  value: z.string(),
  count,
  percent,
});

const columnBase = {
  name: z.string(),
  missingCount: count,
  missingPercent: percent,
  invalidCount: count,
  uniqueCount: count,
  uniquePercent: percent,
};

const histogramBins = z
  .array(z.object({ start: z.number(), end: z.number(), count }))
  .min(1)
  .max(20);

const numericStats = z.object({
  count: z.number().int().positive(),
  mean: z.number(),
  median: z.number(),
  std: nullableNumber,
  min: z.number(),
  max: z.number(),
  q1: z.number(),
  q3: z.number(),
  iqr: z.number(),
  skewness: nullableNumber,
  outliers: z.object({
    count,
    percent,
    lowerFence: z.number(),
    upperFence: z.number(),
  }),
  histogram: histogramBins,
  focusedHistogram: z
    .object({ bins: histogramBins, belowCount: count, aboveCount: count })
    .nullable(),
});

const categoricalStats = z.object({
  topValues: z.array(valueCount).max(10),
  otherCount: count,
});

const datetimeStats = z.object({
  min: z.string(),
  max: z.string(),
  rangeDays: count,
  monthlyCounts: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), count }),
  ),
});

const booleanStats = z.object({
  trueCount: count,
  falseCount: count,
  truePercent: percent,
});

const textStats = z.object({
  minLength: count,
  maxLength: count,
  meanLength: z.number().nonnegative(),
  exampleValues: z.array(z.string()).max(3),
});

const column = z.discriminatedUnion('type', [
  z.object({ ...columnBase, type: z.literal('numeric'), stats: numericStats }),
  z.object({
    ...columnBase,
    type: z.literal('categorical'),
    stats: categoricalStats,
  }),
  z.object({
    ...columnBase,
    type: z.literal('datetime'),
    stats: datetimeStats,
  }),
  z.object({ ...columnBase, type: z.literal('boolean'), stats: booleanStats }),
  z.object({ ...columnBase, type: z.literal('text'), stats: textStats }),
  z.object({ ...columnBase, type: z.literal('id'), stats: textStats }),
]);

const insight = z.object({
  rule: z.enum([
    'high_missing_rate',
    'likely_id',
    'constant_column',
    'strong_correlation',
    'heavy_skew',
    'many_outliers',
    'high_cardinality',
    'possible_duplicates',
    'datetime_as_text',
    'mixed_types',
  ]),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  message: z.string(),
  columns: z.array(z.string()),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      unit: z.enum(['count', 'percent', 'number']),
    }),
  ),
});

export const reportSchema = z.object({
  schemaVersion: z.literal('1.1'),
  generatedAt: z.string().datetime(),
  source: z.object({
    sizeBytes: count,
    encoding: z.string(),
    delimiter: z.string(),
    skippedLineCount: count,
  }),
  sampling: z.object({
    used: z.boolean(),
    totalRows: count,
    sampledRows: count,
    seed: z.number().int().nullable(),
  }),
  overview: z.object({
    rowCount: z.number().int().positive(),
    columnCount: z.number().int().positive(),
    memoryBytes: count,
    duplicateRowCount: count,
    duplicateRowPercent: percent,
    missingCellCount: count,
    missingPercent: percent,
    columnTypeCounts: z.object({
      numeric: count,
      categorical: count,
      datetime: count,
      boolean: count,
      text: count,
      id: count,
    }),
  }),
  columns: z.array(column).min(1),
  missing: z.object({
    columnsWithMissing: count,
    completeRowCount: count,
    completeRowPercent: percent,
    byColumn: z.array(
      z.object({
        name: z.string(),
        missingCount: count,
        missingPercent: percent,
      }),
    ),
  }),
  correlations: z.object({
    method: z.literal('pearson'),
    columns: z.array(z.string()).max(50),
    matrix: z.array(z.array(z.number().min(-1).max(1).nullable())),
    topPairs: z
      .array(
        z.object({
          columnA: z.string(),
          columnB: z.string(),
          r: z.number().min(-1).max(1),
          pairCount: count,
        }),
      )
      .max(10),
    omittedColumnCount: count,
  }),
  insights: z.array(insight),
  preview: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string().nullable())).max(100),
  }),
});

export type IAnalysisReport = z.infer<typeof reportSchema>;
