# Report Schema

The contract between the analysis engine and the rest of InsightLens.

`analysis-engine/profile_dataset.py` produces this JSON. The backend validates
it with Zod, stores it, and serves it. The frontend displays it. Python
computes, Node stores and serves, React displays, so any number the UI shows
must already be in this document or be simple formatting of a value that is.

Current version: **1.1**

## 1. Running the engine

```bat
python profile_dataset.py <path-to-csv>
```

| Outcome | Exit code | stdout | stderr |
|---|---|---|---|
| Success | `0` | One JSON report, nothing else | Ignored |
| Expected failure (unreadable file, no rows, no columns) | `1` | Empty | One line, safe to show the user |
| Unexpected failure | Any other non-zero code | Ignored | Traceback, for logs only |

- Node decides success from the exit code, then parses stdout.
- For exit code `1`, Node stores the stderr line as the Dataset error message.
- For any other failure, including a timeout, Node logs stderr and stores a
  generic message, so internal details never reach the user.
- stdout is pure ASCII. Non-ASCII characters are written as `\uXXXX` escapes.
  This keeps the output safe on Windows, where a piped stdout may not default
  to UTF-8.

A file with a header but no data rows is an expected failure, so a report
always has at least one row and one column.

## 2. Conventions

| Topic | Rule |
|---|---|
| Key naming | camelCase |
| Column data | Always arrays, never objects keyed by column name. A header such as `price.usd` or `$total` is unsafe as a MongoDB key. |
| Column names | Unique within a report. Repeated headers are renamed (`amount`, `amount.1`), blank headers become `Unnamed: 0`. |
| Empty values | Always `null`. `NaN`, `Infinity` and `-Infinity` never appear, because they are not valid JSON. |
| Percentages | 0 to 100, rounded to 2 decimals. `12.5` means 12.5%. |
| Correlation and skewness | Rounded to 4 decimals |
| Other statistics | Rounded to 6 decimals |
| Dates | ISO 8601 with no offset. Source values with a timezone are converted to UTC first. Years outside 1900 to 2100 are invalid, which catches placeholders such as `9999-12-31`. |
| Ordering | `columns` follows file order. Other sort orders are stated per field. |

### Value categories

Every non-empty cell in a column is either valid or invalid for the column's
inferred type, so for every column:

```text
rowCount = missingCount + invalidCount + valid values
```

- **Missing:** an empty cell, a whitespace-only cell, or a standard null marker
  (`NA`, `N/A`, `null`, `NaN` and the other Pandas defaults).
- **Invalid:** present, but not parseable as the column's type, such as
  `pending` in a numeric column. Invalid values are excluded from statistics
  and are not counted as missing. They raise a `mixed_types` insight.

### Size limits

These keep a report well under MongoDB's 16MB document limit, including for
very wide files.

| Limit | Value |
|---|---|
| Histogram bins per column | 20 |
| `topValues` per categorical column | 10 |
| `exampleValues` per text or id column | 3 |
| Length of any value in `topValues` or `exampleValues` | 100 characters |
| Preview rows | 100 |
| Length of a preview cell | 200 characters |
| Columns in the correlation matrix | 50 |
| `topPairs` | 10 |

Longer strings are cut to the limit and end in `...`.

### Sampling

Files with more than 200,000 rows use a seeded random sample, so the same file
always produces the same report.

- **From the sample:** `histogram`, `focusedHistogram` and everything in
  `correlations`.
- **From all rows:** everything else, including means, quartiles and outliers.

## 3. Types

Written in TypeScript notation because it maps directly to the Zod schema in
the backend.

```ts
type Report = {
  schemaVersion: '1.1';
  generatedAt: string; // UTC, e.g. 2026-11-07T15:04:05Z
  source: Source;
  sampling: Sampling;
  overview: Overview;
  columns: Column[];
  missing: Missing;
  correlations: Correlations;
  insights: Insight[];
  preview: Preview;
};

// The original file name is not here: the engine only sees the temporary
// upload path. The Dataset document owns the name.
type Source = {
  sizeBytes: number;
  encoding: string; // "utf-8", "utf-8-sig", "utf-16", "cp1252" or "latin-1"
  delimiter: string; // detected, e.g. ","
  skippedLineCount: number; // malformed lines that could not be read
};

type Sampling = {
  used: boolean;
  totalRows: number;
  sampledRows: number; // equals totalRows when used is false
  seed: number | null; // null when used is false
};

type Overview = {
  rowCount: number;
  columnCount: number;
  memoryBytes: number; // in-memory size of the loaded data
  duplicateRowCount: number; // rows repeating an earlier row in full
  duplicateRowPercent: number; // of rowCount
  missingCellCount: number;
  missingPercent: number; // of rowCount * columnCount
  columnTypeCounts: Record<ColumnType, number>; // every type, zero included
};

type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text' | 'id';

// `type` decides the shape of `stats`.
type Column = ColumnBase &
  (
    | { type: 'numeric'; stats: NumericStats }
    | { type: 'categorical'; stats: CategoricalStats }
    | { type: 'datetime'; stats: DatetimeStats }
    | { type: 'boolean'; stats: BooleanStats }
    | { type: 'text'; stats: TextStats }
    | { type: 'id'; stats: TextStats }
  );

type ColumnBase = {
  name: string;
  missingCount: number;
  missingPercent: number; // of rowCount
  invalidCount: number; // always 0 for categorical, text and id
  uniqueCount: number; // distinct non-missing values
  uniquePercent: number; // of non-missing values
};

type NumericStats = {
  count: number; // valid values, always at least 1
  mean: number;
  median: number;
  std: number | null; // sample standard deviation, null when count < 2
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number | null; // null when count < 3 or all values are equal
  outliers: {
    count: number;
    percent: number; // of count
    lowerFence: number; // q1 - 1.5 * iqr
    upperFence: number; // q3 + 1.5 * iqr
  };
  histogram: HistogramBin[]; // ascending, equal width, one bin if all values are equal
  focusedHistogram: FocusedHistogram | null; // null when no value lies outside the fences
};

// The same binning applied only to values inside the IQR fences, so a few
// extreme values (such as 999 for an unknown age) do not squeeze every other
// row into one bar. The counts say how many values were left out on each side.
type FocusedHistogram = {
  bins: HistogramBin[];
  belowCount: number; // values below lowerFence
  aboveCount: number; // values above upperFence
};

// A bin includes `start` and excludes `end`, except the last, which includes both.
// Bin count follows Sturges' rule (log2(count) + 1), capped at 20 and at the
// number of distinct values.
type HistogramBin = { start: number; end: number; count: number };

type CategoricalStats = {
  topValues: { value: string; count: number; percent: number }[]; // percent of non-missing
  otherCount: number; // non-missing values outside topValues
};

type DatetimeStats = {
  min: string;
  max: string;
  rangeDays: number;
  monthlyCounts: { month: string; count: number }[]; // "YYYY-MM", no gaps, zero-filled
};

type BooleanStats = {
  trueCount: number;
  falseCount: number;
  truePercent: number; // of valid values
};

// Shared by text and id columns. Lengths are in characters.
type TextStats = {
  minLength: number;
  maxLength: number;
  meanLength: number;
  exampleValues: string[];
};

type Missing = {
  columnsWithMissing: number;
  completeRowCount: number; // rows with no missing cell
  completeRowPercent: number; // of rowCount
  byColumn: { name: string; missingCount: number; missingPercent: number }[];
  // Only columns with missing values. Highest first, ties in file order.
};

type Correlations = {
  method: 'pearson';
  columns: string[]; // numeric columns with more than one distinct value, in file order
  matrix: (number | null)[][]; // square, same order as columns
  topPairs: { columnA: string; columnB: string; r: number; pairCount: number }[];
  // Each pair once, strongest |r| first. pairCount is the rows where both have a value.
  omittedColumnCount: number; // eligible columns left out by the 50-column limit
};

type Insight = {
  rule: InsightRule;
  severity: 'critical' | 'warning' | 'info';
  title: string; // short, e.g. "High missing rate in note"
  message: string; // plain English explanation
  columns: string[]; // empty when the insight is about the whole dataset
  metrics: { label: string; value: number; unit: 'count' | 'percent' | 'number' }[];
};
// Sorted critical, then warning, then info.

type InsightRule =
  | 'high_missing_rate'
  | 'likely_id'
  | 'constant_column'
  | 'strong_correlation'
  | 'heavy_skew'
  | 'many_outliers'
  | 'high_cardinality'
  | 'possible_duplicates'
  | 'datetime_as_text'
  | 'mixed_types';

type Preview = {
  columns: string[];
  rows: (string | null)[][]; // first 100 rows, same order as columns
};
```

### Field notes

**Column types**

| Type | Meaning |
|---|---|
| `numeric` | Numbers that measure something |
| `categorical` | A limited set of repeating values |
| `datetime` | Dates or timestamps |
| `boolean` | Both values of one pair: `true`/`false`, `yes`/`no`, `y`/`n`, `t`/`f` or `1`/`0`, in any case |
| `text` | Free text with mostly unique values |
| `id` | Identifiers, even when they are made of digits |

A column with no values at all has no type of its own. It is reported as
`categorical` with empty `topValues`, which also keeps `count` in
`NumericStats` from ever being zero. An `id` column made of digits is reported
in `TextStats` as strings, because long identifiers lose precision as JSON
numbers.

**Correlations.** Fewer than two eligible columns gives empty `columns`,
`matrix` and `topPairs`. A matrix cell is `null` when two columns have too few
rows in common to compute `r`. The diagonal is always `1`.

**Preview.** Cells are the original text from the file, and `null` means
missing. They are not converted to the inferred type, so messy values stay
visible to the user. Any number formatting in the table happens in the frontend.

**Metrics.** `metrics` holds the numbers behind an insight, so the UI can show
evidence and not only a sentence. The thresholds that trigger each rule belong
to the engine's config and are not part of this contract.

**`datetime_as_text`.** Every date in a CSV is technically text, so this rule
fires only for dates not in ISO 8601 format: `info` for one other format,
`warning` when a column mixes formats.

## 4. Example

The report the engine produces for this eight-row file. Only `generatedAt` and
`memoryBytes` change between runs and machines. The test suite runs the engine
on this file and compares the result with the JSON below, so the example cannot
drift from the code.

```csv
order_id,region,order_date,amount,quantity,returned,note
ORD-1001,North,2024-01-15,120.50,2,no,Gift wrap requested for delivery
ORD-1002,South,2024-01-28,80.00,1,no,
ORD-1003,North,2024-02-03,240.00,4,yes,Customer asked for a refund
ORD-1004,,2024-02-19,160.00,3,no,
ORD-1005,West,not a date,95.00,,no,Left at the front door
ORD-1006,South,2024-03-07,950.00,5,no,Bulk order for a school
ORD-1007,North,2024-03-22,,2,yes,
ORD-1008,South,2024-03-30,pending,1,no,
```

```json
{
  "schemaVersion": "1.1",
  "generatedAt": "2026-11-07T15:04:05Z",
  "source": {
    "sizeBytes": 461,
    "encoding": "utf-8",
    "delimiter": ",",
    "skippedLineCount": 0
  },
  "sampling": {
    "used": false,
    "totalRows": 8,
    "sampledRows": 8,
    "seed": null
  },
  "overview": {
    "rowCount": 8,
    "columnCount": 7,
    "memoryBytes": 3497,
    "duplicateRowCount": 0,
    "duplicateRowPercent": 0,
    "missingCellCount": 7,
    "missingPercent": 12.5,
    "columnTypeCounts": {
      "numeric": 2,
      "categorical": 1,
      "datetime": 1,
      "boolean": 1,
      "text": 1,
      "id": 1
    }
  },
  "columns": [
    {
      "name": "order_id",
      "type": "id",
      "missingCount": 0,
      "missingPercent": 0,
      "invalidCount": 0,
      "uniqueCount": 8,
      "uniquePercent": 100,
      "stats": {
        "minLength": 8,
        "maxLength": 8,
        "meanLength": 8,
        "exampleValues": ["ORD-1001", "ORD-1002", "ORD-1003"]
      }
    },
    {
      "name": "region",
      "type": "categorical",
      "missingCount": 1,
      "missingPercent": 12.5,
      "invalidCount": 0,
      "uniqueCount": 3,
      "uniquePercent": 42.86,
      "stats": {
        "topValues": [
          { "value": "North", "count": 3, "percent": 42.86 },
          { "value": "South", "count": 3, "percent": 42.86 },
          { "value": "West", "count": 1, "percent": 14.29 }
        ],
        "otherCount": 0
      }
    },
    {
      "name": "order_date",
      "type": "datetime",
      "missingCount": 0,
      "missingPercent": 0,
      "invalidCount": 1,
      "uniqueCount": 8,
      "uniquePercent": 100,
      "stats": {
        "min": "2024-01-15T00:00:00",
        "max": "2024-03-30T00:00:00",
        "rangeDays": 75,
        "monthlyCounts": [
          { "month": "2024-01", "count": 2 },
          { "month": "2024-02", "count": 2 },
          { "month": "2024-03", "count": 3 }
        ]
      }
    },
    {
      "name": "amount",
      "type": "numeric",
      "missingCount": 1,
      "missingPercent": 12.5,
      "invalidCount": 1,
      "uniqueCount": 7,
      "uniquePercent": 100,
      "stats": {
        "count": 6,
        "mean": 274.25,
        "median": 140.25,
        "std": 335.96633,
        "min": 80,
        "max": 950,
        "q1": 101.375,
        "q3": 220,
        "iqr": 118.625,
        "skewness": 2.2967,
        "outliers": {
          "count": 1,
          "percent": 16.67,
          "lowerFence": -76.5625,
          "upperFence": 397.9375
        },
        "histogram": [
          { "start": 80, "end": 297.5, "count": 5 },
          { "start": 297.5, "end": 515, "count": 0 },
          { "start": 515, "end": 732.5, "count": 0 },
          { "start": 732.5, "end": 950, "count": 1 }
        ],
        "focusedHistogram": {
          "bins": [
            { "start": 80, "end": 120, "count": 2 },
            { "start": 120, "end": 160, "count": 1 },
            { "start": 160, "end": 200, "count": 1 },
            { "start": 200, "end": 240, "count": 1 }
          ],
          "belowCount": 0,
          "aboveCount": 1
        }
      }
    },
    {
      "name": "quantity",
      "type": "numeric",
      "missingCount": 1,
      "missingPercent": 12.5,
      "invalidCount": 0,
      "uniqueCount": 5,
      "uniquePercent": 71.43,
      "stats": {
        "count": 7,
        "mean": 2.571429,
        "median": 2,
        "std": 1.511858,
        "min": 1,
        "max": 5,
        "q1": 1.5,
        "q3": 3.5,
        "iqr": 2,
        "skewness": 0.6201,
        "outliers": {
          "count": 0,
          "percent": 0,
          "lowerFence": -1.5,
          "upperFence": 6.5
        },
        "histogram": [
          { "start": 1, "end": 2, "count": 2 },
          { "start": 2, "end": 3, "count": 2 },
          { "start": 3, "end": 4, "count": 1 },
          { "start": 4, "end": 5, "count": 2 }
        ],
        "focusedHistogram": null
      }
    },
    {
      "name": "returned",
      "type": "boolean",
      "missingCount": 0,
      "missingPercent": 0,
      "invalidCount": 0,
      "uniqueCount": 2,
      "uniquePercent": 25,
      "stats": {
        "trueCount": 2,
        "falseCount": 6,
        "truePercent": 25
      }
    },
    {
      "name": "note",
      "type": "text",
      "missingCount": 4,
      "missingPercent": 50,
      "invalidCount": 0,
      "uniqueCount": 4,
      "uniquePercent": 100,
      "stats": {
        "minLength": 22,
        "maxLength": 32,
        "meanLength": 26,
        "exampleValues": [
          "Gift wrap requested for delivery",
          "Customer asked for a refund",
          "Left at the front door"
        ]
      }
    }
  ],
  "missing": {
    "columnsWithMissing": 4,
    "completeRowCount": 3,
    "completeRowPercent": 37.5,
    "byColumn": [
      { "name": "note", "missingCount": 4, "missingPercent": 50 },
      { "name": "region", "missingCount": 1, "missingPercent": 12.5 },
      { "name": "amount", "missingCount": 1, "missingPercent": 12.5 },
      { "name": "quantity", "missingCount": 1, "missingPercent": 12.5 }
    ]
  },
  "correlations": {
    "method": "pearson",
    "columns": ["amount", "quantity"],
    "matrix": [
      [1, 0.8109],
      [0.8109, 1]
    ],
    "topPairs": [
      { "columnA": "amount", "columnB": "quantity", "r": 0.8109, "pairCount": 5 }
    ],
    "omittedColumnCount": 0
  },
  "insights": [
    {
      "rule": "high_missing_rate",
      "severity": "critical",
      "title": "High missing rate in note",
      "message": "4 of 8 values in note are missing. Check whether the gaps are expected before relying on this column.",
      "columns": [
        "note"
      ],
      "metrics": [
        {
          "label": "Missing values",
          "value": 4,
          "unit": "count"
        },
        {
          "label": "Missing",
          "value": 50.0,
          "unit": "percent"
        }
      ]
    },
    {
      "rule": "mixed_types",
      "severity": "warning",
      "title": "Unexpected values in order_date",
      "message": "1 value in order_date could not be read as a date and was left out of its statistics.",
      "columns": [
        "order_date"
      ],
      "metrics": [
        {
          "label": "Invalid values",
          "value": 1,
          "unit": "count"
        }
      ]
    },
    {
      "rule": "mixed_types",
      "severity": "warning",
      "title": "Unexpected values in amount",
      "message": "1 value in amount could not be read as a number and was left out of its statistics.",
      "columns": [
        "amount"
      ],
      "metrics": [
        {
          "label": "Invalid values",
          "value": 1,
          "unit": "count"
        }
      ]
    },
    {
      "rule": "heavy_skew",
      "severity": "warning",
      "title": "Heavy skew in amount",
      "message": "amount is strongly right-skewed: a tail of high values pulls the mean (274.25) above the median (140.25). The median better describes a typical value.",
      "columns": [
        "amount"
      ],
      "metrics": [
        {
          "label": "Skewness",
          "value": 2.2967,
          "unit": "number"
        },
        {
          "label": "Mean",
          "value": 274.25,
          "unit": "number"
        },
        {
          "label": "Median",
          "value": 140.25,
          "unit": "number"
        }
      ]
    },
    {
      "rule": "many_outliers",
      "severity": "warning",
      "title": "Many outliers in amount",
      "message": "1 value in amount falls outside the expected range of -76.56 to 397.94. They may be errors or genuine extreme cases.",
      "columns": [
        "amount"
      ],
      "metrics": [
        {
          "label": "Outliers",
          "value": 1,
          "unit": "count"
        },
        {
          "label": "Of valid values",
          "value": 16.67,
          "unit": "percent"
        }
      ]
    },
    {
      "rule": "strong_correlation",
      "severity": "info",
      "title": "Strong correlation between amount and quantity",
      "message": "amount and quantity tend to rise together across 5 rows. Correlation alone does not show that one causes the other.",
      "columns": [
        "amount",
        "quantity"
      ],
      "metrics": [
        {
          "label": "Pearson r",
          "value": 0.8109,
          "unit": "number"
        },
        {
          "label": "Rows compared",
          "value": 5,
          "unit": "count"
        }
      ]
    },
    {
      "rule": "likely_id",
      "severity": "info",
      "title": "order_id looks like an identifier",
      "message": "100% of the values in order_id are unique, so it identifies rows and was left out of numeric analysis.",
      "columns": [
        "order_id"
      ],
      "metrics": [
        {
          "label": "Unique",
          "value": 100.0,
          "unit": "percent"
        }
      ]
    }
  ],
  "preview": {
    "columns": ["order_id", "region", "order_date", "amount", "quantity", "returned", "note"],
    "rows": [
      ["ORD-1001", "North", "2024-01-15", "120.50", "2", "no", "Gift wrap requested for delivery"],
      ["ORD-1002", "South", "2024-01-28", "80.00", "1", "no", null],
      ["ORD-1003", "North", "2024-02-03", "240.00", "4", "yes", "Customer asked for a refund"],
      ["ORD-1004", null, "2024-02-19", "160.00", "3", "no", null],
      ["ORD-1005", "West", "not a date", "95.00", null, "no", "Left at the front door"],
      ["ORD-1006", "South", "2024-03-07", "950.00", "5", "no", "Bulk order for a school"],
      ["ORD-1007", "North", "2024-03-22", null, "2", "yes", null],
      ["ORD-1008", "South", "2024-03-30", "pending", "1", "no", null]
    ]
  }
}
```

## 5. Changing the contract

Any change is made here first, then in the engine, the Zod schema and the
frontend types, and `schemaVersion` is updated. Reports already in MongoDB keep
the version they were created with, so the frontend can tell what shape it has
received.
