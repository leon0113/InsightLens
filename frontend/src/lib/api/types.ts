// Shapes returned by the API. The report types mirror docs/report_schema.md;
// change them together with that document.

export type ApiMeta = { page: number; limit: number; total: number };

export type ApiResponse<T> = {
  success: boolean;
  message: string | null;
  meta?: ApiMeta;
  data: T;
};

export type FieldError = { path: string; message: string };

export type User = {
  _id: string;
  userId: string;
  name: string;
  role: 'user' | 'admin';
};

export type DatasetStatus = 'processing' | 'ready' | 'failed';

export type Dataset = {
  _id: string;
  name: string;
  sizeBytes: number;
  status: DatasetStatus;
  errorMessage?: string;
  rowCount?: number;
  columnCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type DatasetListParams = {
  page: number;
  limit: number;
  searchTerm?: string;
};

export type DatasetReport = { dataset: Dataset; report: Report };

export type DemoReport = {
  dataset: { slug: string; title: string; description: string; name: string };
  report: Report;
};

export type Report = {
  schemaVersion: string;
  generatedAt: string;
  source: Source;
  sampling: Sampling;
  overview: Overview;
  columns: Column[];
  missing: Missing;
  correlations: Correlations;
  insights: Insight[];
  preview: Preview;
};

export type Source = {
  sizeBytes: number;
  encoding: string;
  delimiter: string;
  skippedLineCount: number;
};

export type Sampling = {
  used: boolean;
  totalRows: number;
  sampledRows: number;
  seed: number | null;
};

export type ColumnType =
  'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text' | 'id';

export type Overview = {
  rowCount: number;
  columnCount: number;
  memoryBytes: number;
  duplicateRowCount: number;
  duplicateRowPercent: number;
  missingCellCount: number;
  missingPercent: number;
  columnTypeCounts: Record<ColumnType, number>;
};

export type ColumnBase = {
  name: string;
  missingCount: number;
  missingPercent: number;
  invalidCount: number;
  uniqueCount: number;
  uniquePercent: number;
};

export type HistogramBin = { start: number; end: number; count: number };

export type FocusedHistogram = {
  bins: HistogramBin[];
  belowCount: number;
  aboveCount: number;
};

export type NumericStats = {
  count: number;
  mean: number;
  median: number;
  std: number | null;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number | null;
  outliers: {
    count: number;
    percent: number;
    lowerFence: number;
    upperFence: number;
  };
  histogram: HistogramBin[];
  // Absent in reports created with schema 1.0.
  focusedHistogram?: FocusedHistogram | null;
};

export type ValueCount = { value: string; count: number; percent: number };

export type CategoricalStats = { topValues: ValueCount[]; otherCount: number };

export type DatetimeStats = {
  min: string;
  max: string;
  rangeDays: number;
  monthlyCounts: { month: string; count: number }[];
};

export type BooleanStats = {
  trueCount: number;
  falseCount: number;
  truePercent: number;
};

export type TextStats = {
  minLength: number;
  maxLength: number;
  meanLength: number;
  exampleValues: string[];
};

export type NumericColumn = ColumnBase & {
  type: 'numeric';
  stats: NumericStats;
};
export type DatetimeColumn = ColumnBase & {
  type: 'datetime';
  stats: DatetimeStats;
};

export type Column =
  | NumericColumn
  | (ColumnBase & { type: 'categorical'; stats: CategoricalStats })
  | DatetimeColumn
  | (ColumnBase & { type: 'boolean'; stats: BooleanStats })
  | (ColumnBase & { type: 'text'; stats: TextStats })
  | (ColumnBase & { type: 'id'; stats: TextStats });

export type Missing = {
  columnsWithMissing: number;
  completeRowCount: number;
  completeRowPercent: number;
  byColumn: { name: string; missingCount: number; missingPercent: number }[];
};

export type CorrelationPair = {
  columnA: string;
  columnB: string;
  r: number;
  pairCount: number;
};

export type Correlations = {
  method: 'pearson';
  columns: string[];
  matrix: (number | null)[][];
  topPairs: CorrelationPair[];
  omittedColumnCount: number;
};

export type Severity = 'critical' | 'warning' | 'info';

export type InsightMetric = {
  label: string;
  value: number;
  unit: 'count' | 'percent' | 'number';
};

export type Insight = {
  rule: string;
  severity: Severity;
  title: string;
  message: string;
  columns: string[];
  metrics: InsightMetric[];
};

export type Preview = { columns: string[]; rows: (string | null)[][] };
