"""Pearson correlations between numeric columns."""

import numpy as np
import pandas as pd

from eda.config import LIMITS
from eda.formatting import clean_number
from eda.types import ParsedColumn

R_DIGITS = 4


def compute_correlations(
    columns: list[ParsedColumn], sample_index: pd.Index | None
) -> dict:
    """Build the report's `correlations` section."""
    eligible = [
        column
        for column in columns
        if column.type == "numeric" and column.valid.nunique() > 1
    ]
    used = eligible[: LIMITS["correlation_columns"]]
    result = {
        "method": "pearson",
        "columns": [],
        "matrix": [],
        "topPairs": [],
        "omittedColumnCount": len(eligible) - len(used),
    }
    if len(used) < 2:
        return result

    frame = pd.DataFrame({column.name: column.valid for column in used})
    if sample_index is not None:
        frame = frame[frame.index.isin(sample_index)]

    corr = frame.corr(method="pearson", min_periods=LIMITS["correlation_min_pairs"])
    # A column always correlates perfectly with itself, even with too few rows to compute.
    values = corr.to_numpy(copy=True)
    np.fill_diagonal(values, 1.0)

    names = list(corr.columns)
    result["columns"] = names
    result["matrix"] = [[clean_number(value, R_DIGITS) for value in row] for row in values]
    result["topPairs"] = _top_pairs(names, values, frame)
    return result


def _top_pairs(names: list[str], values: np.ndarray, frame: pd.DataFrame) -> list[dict]:
    """List each pair once, strongest first, with how many rows both columns share."""
    has_value = frame.notna().to_numpy().astype(int)
    pair_counts = has_value.T @ has_value

    pairs = [
        {
            "columnA": names[a],
            "columnB": names[b],
            "r": clean_number(values[a, b], R_DIGITS),
            "pairCount": int(pair_counts[a, b]),
        }
        for a in range(len(names))
        for b in range(a + 1, len(names))
        if not np.isnan(values[a, b])
    ]
    pairs.sort(key=lambda pair: -abs(pair["r"]))
    return pairs[: LIMITS["top_pairs"]]
