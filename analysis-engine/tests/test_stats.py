"""Statistics checked against values worked out by hand."""

import pandas as pd
import pytest

from eda import config
from eda.correlations import compute_correlations
from eda.formatting import clean_number
from eda.stats import (
    boolean_stats,
    categorical_stats,
    datetime_stats,
    histogram,
    numeric_stats,
    text_stats,
)
from eda.types import ParsedColumn


def numbers(values: list[float]) -> pd.Series:
    return pd.Series(values, dtype=float)


def test_numeric_summary():
    stats = numeric_stats(numbers([1, 2, 3, 4, 100]))

    assert stats["count"] == 5
    assert stats["mean"] == 22
    assert stats["median"] == 3
    assert stats["min"] == 1
    assert stats["max"] == 100
    assert stats["q1"] == 2
    assert stats["q3"] == 4
    assert stats["iqr"] == 2
    assert stats["skewness"] > 2


def test_iqr_outliers():
    outliers = numeric_stats(numbers([1, 2, 3, 4, 100]))["outliers"]

    assert outliers == {"count": 1, "percent": 20.0, "lowerFence": -1.0, "upperFence": 7.0}


def test_single_value_has_no_spread_or_skew():
    stats = numeric_stats(numbers([5]))

    assert stats["std"] is None
    assert stats["skewness"] is None
    assert stats["histogram"] == [{"start": 5.0, "end": 5.0, "count": 1}]


def test_constant_values_get_one_bin():
    assert histogram(numbers([7, 7, 7, 7])) == [{"start": 7.0, "end": 7.0, "count": 4}]


def test_histogram_counts_every_value_once():
    values = numbers(list(range(100)))
    bins = histogram(values)

    assert sum(b["count"] for b in bins) == 100
    assert bins[0]["start"] == 0
    assert bins[-1]["end"] == 99


def test_histogram_uses_the_sample_when_given():
    values = numbers([1, 2, 3, 4, 5, 6])
    stats = numeric_stats(values, sample_index=pd.Index([0, 1, 2]))

    assert stats["count"] == 6
    assert sum(b["count"] for b in stats["histogram"]) == 3


def test_focused_histogram_leaves_out_values_beyond_the_fences():
    values = numbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 999])
    focused = numeric_stats(values)["focusedHistogram"]

    assert focused["aboveCount"] == 1
    assert focused["belowCount"] == 0
    assert sum(b["count"] for b in focused["bins"]) == 9
    assert focused["bins"][-1]["end"] == 9


def test_focused_histogram_is_null_without_outliers():
    assert numeric_stats(numbers([1, 2, 3, 4, 5]))["focusedHistogram"] is None


def test_categorical_ties_are_alphabetical():
    stats = categorical_stats(pd.Series(["b", "a", "b", "a", "c"]))

    assert [v["value"] for v in stats["topValues"]] == ["a", "b", "c"]
    assert stats["topValues"][0] == {"value": "a", "count": 2, "percent": 40.0}
    assert stats["otherCount"] == 0


def test_categorical_keeps_top_ten_and_counts_the_rest():
    values = pd.Series([f"v{n:02d}" for n in range(15)] + ["v00"])
    stats = categorical_stats(values)

    assert len(stats["topValues"]) == 10
    assert stats["topValues"][0]["value"] == "v00"
    assert stats["otherCount"] == 5


def test_datetime_months_are_zero_filled():
    dates = pd.Series(pd.to_datetime(["2024-01-10", "2024-03-05", "2024-03-20"]))
    stats = datetime_stats(dates)

    assert stats["min"] == "2024-01-10T00:00:00"
    assert stats["rangeDays"] == 70
    assert stats["monthlyCounts"] == [
        {"month": "2024-01", "count": 1},
        {"month": "2024-02", "count": 0},
        {"month": "2024-03", "count": 2},
    ]


def test_boolean_counts():
    assert boolean_stats(pd.Series([True, False, True, True])) == {
        "trueCount": 3,
        "falseCount": 1,
        "truePercent": 75.0,
    }


def test_text_lengths_and_truncated_examples():
    long_value = "x" * 150
    stats = text_stats(pd.Series(["ab", "abcd", long_value]))

    assert stats["minLength"] == 2
    assert stats["maxLength"] == 150
    assert stats["exampleValues"][2] == "x" * 97 + "..."


def numeric_column(name: str, values: list) -> ParsedColumn:
    series = pd.Series(values, dtype=float).dropna()
    return ParsedColumn(name, "numeric", series.astype(str), series)


def test_correlation_matrix_and_pairs():
    columns = [
        numeric_column("x", [1, 2, 3, 4, 5]),
        numeric_column("y", [2, 4, 6, 8, 10]),
        numeric_column("z", [5, 4, 3, 2, 1]),
    ]
    result = compute_correlations(columns, None)

    assert result["columns"] == ["x", "y", "z"]
    assert result["matrix"][0] == [1.0, 1.0, -1.0]
    assert result["topPairs"][0] == {"columnA": "x", "columnB": "y", "r": 1.0, "pairCount": 5}
    assert len(result["topPairs"]) == 3


def test_correlation_skips_constant_columns_and_needs_two():
    columns = [numeric_column("x", [1, 2, 3]), numeric_column("flat", [4, 4, 4])]
    result = compute_correlations(columns, None)

    assert result["columns"] == []
    assert result["matrix"] == []


def test_too_few_shared_rows_gives_null():
    columns = [
        numeric_column("x", [1, 2, None, None, 5]),
        numeric_column("y", [None, None, 3, 4, 6]),
    ]
    result = compute_correlations(columns, None)

    assert result["matrix"] == [[1.0, None], [None, 1.0]]
    assert result["topPairs"] == []


def test_correlation_column_limit(monkeypatch):
    monkeypatch.setitem(config.LIMITS, "correlation_columns", 2)
    columns = [numeric_column(name, [1, 2, 3, 4]) for name in "abc"]
    result = compute_correlations(columns, None)

    assert result["columns"] == ["a", "b"]
    assert result["omittedColumnCount"] == 1


@pytest.mark.parametrize("value", [float("nan"), float("inf")])
def test_non_finite_numbers_become_null(value):
    assert clean_number(value) is None
