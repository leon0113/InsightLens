"""Assemble the full report defined in docs/report_schema.md."""

from datetime import datetime, timezone

import pandas as pd

from eda.config import LIMITS
from eda.correlations import compute_correlations
from eda.formatting import percent, truncate
from eda.insights import build_insights
from eda.missing import summarize_missing
from eda.reader import LoadedFile, load_csv
from eda.stats import profile_column
from eda.types import infer_column

SCHEMA_VERSION = "1.1"
COLUMN_TYPES = ("numeric", "categorical", "datetime", "boolean", "text", "id")


def build_report(path: str) -> dict:
    """Read a CSV and return its complete report."""
    loaded = load_csv(path)
    frame = loaded.frame
    row_count = len(frame)

    sample_index = _sample_index(frame)
    parsed = [infer_column(str(name), frame[name]) for name in frame.columns]
    columns = [profile_column(column, row_count, sample_index) for column in parsed]
    overview = _overview(frame, columns)
    correlations = compute_correlations(parsed, sample_index)

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": _source(loaded),
        "sampling": _sampling(row_count, sample_index),
        "overview": overview,
        "columns": columns,
        "missing": summarize_missing(frame, columns),
        "correlations": correlations,
        "insights": build_insights(parsed, columns, overview, correlations),
        "preview": _preview(frame),
    }


def _sample_index(frame: pd.DataFrame) -> pd.Index | None:
    """Choose the rows for heavy statistics. None means use every row."""
    if len(frame) <= LIMITS["sample_rows"]:
        return None
    sample = frame.sample(n=LIMITS["sample_rows"], random_state=LIMITS["sample_seed"])
    return sample.index


def _source(loaded: LoadedFile) -> dict:
    return {
        "sizeBytes": loaded.size_bytes,
        "encoding": loaded.encoding,
        "delimiter": loaded.delimiter,
        "skippedLineCount": loaded.skipped_line_count,
    }


def _sampling(row_count: int, sample_index: pd.Index | None) -> dict:
    used = sample_index is not None
    return {
        "used": used,
        "totalRows": row_count,
        "sampledRows": len(sample_index) if used else row_count,
        "seed": LIMITS["sample_seed"] if used else None,
    }


def _overview(frame: pd.DataFrame, columns: list[dict]) -> dict:
    row_count, column_count = frame.shape
    duplicate_rows = int(frame.duplicated().sum())
    missing_cells = sum(column["missingCount"] for column in columns)
    types = [column["type"] for column in columns]
    return {
        "rowCount": row_count,
        "columnCount": column_count,
        "memoryBytes": int(frame.memory_usage(deep=True).sum()),
        "duplicateRowCount": duplicate_rows,
        "duplicateRowPercent": percent(duplicate_rows, row_count),
        "missingCellCount": missing_cells,
        "missingPercent": percent(missing_cells, row_count * column_count),
        "columnTypeCounts": {name: types.count(name) for name in COLUMN_TYPES},
    }


def _preview(frame: pd.DataFrame) -> dict:
    head = frame.head(LIMITS["preview_rows"])
    limit = LIMITS["preview_cell_length"]
    return {
        "columns": [str(name) for name in frame.columns],
        "rows": [
            [None if pd.isna(cell) else truncate(cell, limit) for cell in row]
            for row in head.itertuples(index=False, name=None)
        ],
    }
