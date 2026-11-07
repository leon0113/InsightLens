"""Summarise missing values across the dataset."""

import pandas as pd

from eda.formatting import percent


def summarize_missing(frame: pd.DataFrame, columns: list[dict]) -> dict:
    """Build the report's `missing` section from the column profiles."""
    with_missing = [column for column in columns if column["missingCount"] > 0]
    by_column = sorted(with_missing, key=lambda column: -column["missingCount"])
    complete_rows = int(frame.notna().all(axis=1).sum())
    return {
        "columnsWithMissing": len(with_missing),
        "completeRowCount": complete_rows,
        "completeRowPercent": percent(complete_rows, len(frame)),
        "byColumn": [
            {
                "name": column["name"],
                "missingCount": column["missingCount"],
                "missingPercent": column["missingPercent"],
            }
            for column in by_column
        ],
    }
