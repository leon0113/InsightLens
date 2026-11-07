"""Per-column statistics. Every function here reads a ParsedColumn and returns plain data."""

import numpy as np
import pandas as pd

from eda.config import LIMITS
from eda.formatting import clean_number, percent, truncate
from eda.types import ParsedColumn, histogram_bin_count

SKEW_DIGITS = 4


def profile_column(
    column: ParsedColumn, row_count: int, sample_index: pd.Index | None
) -> dict:
    """Build a column's entry in the report's `columns` list."""
    missing_count = row_count - len(column.raw)
    unique_count = int(column.raw.nunique())
    return {
        "name": column.name,
        "type": column.type,
        "missingCount": missing_count,
        "missingPercent": percent(missing_count, row_count),
        "invalidCount": column.invalid_count,
        "uniqueCount": unique_count,
        "uniquePercent": percent(unique_count, len(column.raw)),
        "stats": _column_stats(column, sample_index),
    }


def _column_stats(column: ParsedColumn, sample_index: pd.Index | None) -> dict:
    if column.type == "numeric":
        return numeric_stats(column.valid, sample_index)
    if column.type == "datetime":
        return datetime_stats(column.valid)
    if column.type == "boolean":
        return boolean_stats(column.valid)
    if column.type == "categorical":
        return categorical_stats(column.valid)
    return text_stats(column.valid)


def numeric_stats(values: pd.Series, sample_index: pd.Index | None = None) -> dict:
    """Summary statistics from all rows, and a histogram from the sample if there is one."""
    q1, q3 = values.quantile([0.25, 0.75])
    iqr = q3 - q1
    lower_fence, upper_fence = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    sampled = _sampled(values, sample_index)
    return {
        "count": len(values),
        "mean": clean_number(values.mean()),
        "median": clean_number(values.median()),
        "std": clean_number(values.std()),
        "min": clean_number(values.min()),
        "max": clean_number(values.max()),
        "q1": clean_number(q1),
        "q3": clean_number(q3),
        "iqr": clean_number(iqr),
        "skewness": clean_number(values.skew(), SKEW_DIGITS),
        "outliers": _outliers(values, lower_fence, upper_fence),
        "histogram": histogram(sampled),
        "focusedHistogram": focused_histogram(sampled, lower_fence, upper_fence),
    }


def _outliers(values: pd.Series, lower_fence: float, upper_fence: float) -> dict:
    count = int(((values < lower_fence) | (values > upper_fence)).sum())
    return {
        "count": count,
        "percent": percent(count, len(values)),
        "lowerFence": clean_number(lower_fence),
        "upperFence": clean_number(upper_fence),
    }


def _sampled(values: pd.Series, sample_index: pd.Index | None) -> pd.Series:
    """Restrict to the sampled rows, unless that would leave nothing to plot."""
    if sample_index is None:
        return values
    sampled = values[values.index.isin(sample_index)]
    return sampled if not sampled.empty else values


def histogram(values: pd.Series) -> list[dict]:
    """Bin values into equal-width bins. A column of one value gets a single bin."""
    low, high = clean_number(values.min()), clean_number(values.max())
    if values.min() == values.max():
        return [{"start": low, "end": high, "count": len(values)}]

    bins = histogram_bin_count(len(values), values.nunique(), LIMITS["histogram_bins"])
    counts, edges = np.histogram(values, bins=bins)
    return [
        {
            "start": clean_number(edges[i]),
            "end": clean_number(edges[i + 1]),
            "count": int(counts[i]),
        }
        for i in range(bins)
    ]


def focused_histogram(
    values: pd.Series, lower_fence: float, upper_fence: float
) -> dict | None:
    """Histogram of the values inside the IQR fences, with counts of those left out.

    A few extreme values (such as 999 for an unknown age) stretch equal-width bins
    until almost every row shares one bar. Returns None when no value lies outside
    the fences, because the regular histogram is then already focused.
    """
    inside = values[(values >= lower_fence) & (values <= upper_fence)]
    below_count = int((values < lower_fence).sum())
    above_count = int((values > upper_fence).sum())
    if below_count + above_count == 0 or inside.empty:
        return None
    return {
        "bins": histogram(inside),
        "belowCount": below_count,
        "aboveCount": above_count,
    }


def categorical_stats(values: pd.Series) -> dict:
    """Most common values first, with ties in alphabetical order."""
    counts = values.value_counts().rename_axis("value").reset_index(name="count")
    counts = counts.sort_values(["count", "value"], ascending=[False, True])
    top = counts.head(LIMITS["top_values"])
    return {
        "topValues": [
            {
                "value": truncate(row.value, LIMITS["value_length"]),
                "count": int(row.count),
                "percent": percent(row.count, len(values)),
            }
            for row in top.itertuples(index=False)
        ],
        "otherCount": len(values) - int(top["count"].sum()),
    }


def datetime_stats(values: pd.Series) -> dict:
    """Date range, plus counts for every month in it. Empty months are shown as zero."""
    earliest, latest = values.min(), values.max()
    months = values.dt.to_period("M")
    all_months = pd.period_range(months.min(), months.max(), freq="M")
    counts = months.value_counts().reindex(all_months, fill_value=0)
    return {
        "min": earliest.strftime("%Y-%m-%dT%H:%M:%S"),
        "max": latest.strftime("%Y-%m-%dT%H:%M:%S"),
        "rangeDays": (latest - earliest).days,
        "monthlyCounts": [
            {"month": str(month), "count": int(count)} for month, count in counts.items()
        ],
    }


def boolean_stats(values: pd.Series) -> dict:
    true_count = int(values.sum())
    return {
        "trueCount": true_count,
        "falseCount": len(values) - true_count,
        "truePercent": percent(true_count, len(values)),
    }


def text_stats(values: pd.Series) -> dict:
    """Shared by text and id columns."""
    lengths = values.str.len()
    examples = values.drop_duplicates().head(LIMITS["example_values"])
    return {
        "minLength": int(lengths.min()),
        "maxLength": int(lengths.max()),
        "meanLength": clean_number(lengths.mean()),
        "exampleValues": [truncate(value, LIMITS["value_length"]) for value in examples],
    }
