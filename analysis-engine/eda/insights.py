"""Rule-based insights. Each rule turns report data into plain English findings."""

from eda.config import THRESHOLDS
from eda.types import ParsedColumn

SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}
INVALID_DESCRIPTIONS = {
    "numeric": "a number",
    "datetime": "a date",
    "boolean": "a yes/no value",
}


def build_insights(
    parsed: list[ParsedColumn],
    columns: list[dict],
    overview: dict,
    correlations: dict,
) -> list[dict]:
    """Run every rule and return the findings, most severe first."""
    insights = []
    for column in columns:
        insights += _high_missing_rate(column, overview["rowCount"])
    insights += _possible_duplicates(overview)
    for column in columns:
        insights += _constant_column(column, overview["rowCount"])
        insights += _mixed_types(column)
    for column in columns:
        insights += _heavy_skew(column)
        insights += _many_outliers(column)
    for parsed_column in parsed:
        insights += _datetime_as_text(parsed_column)
    for column in columns:
        insights += _high_cardinality(column)
    insights += _strong_correlations(correlations)
    for column in columns:
        insights += _likely_id(column)
    return sorted(insights, key=lambda insight: SEVERITY_ORDER[insight["severity"]])


def _insight(
    rule: str, severity: str, title: str, message: str, columns: list[str], metrics: list[dict]
) -> dict:
    return {
        "rule": rule,
        "severity": severity,
        "title": title,
        "message": message,
        "columns": columns,
        "metrics": metrics,
    }


def _metric(label: str, value: float, unit: str) -> dict:
    return {"label": label, "value": value, "unit": unit}


def _count(count: int, noun: str) -> str:
    """Write a count with its noun, e.g. '1 value' or '1,204 values'."""
    return f"{count:,} {noun}" if count == 1 else f"{count:,} {noun}s"


def _readable(value: float) -> str:
    """Format a number for a sentence: thousands separators, at most 2 decimals."""
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def _high_missing_rate(column: dict, row_count: int) -> list[dict]:
    missing = column["missingPercent"]
    if missing >= THRESHOLDS["missing_critical_percent"]:
        severity = "critical"
    elif missing >= THRESHOLDS["missing_warning_percent"]:
        severity = "warning"
    else:
        return []

    name = column["name"]
    count = column["missingCount"]
    return [
        _insight(
            "high_missing_rate",
            severity,
            f"High missing rate in {name}",
            f"{count:,} of {row_count:,} values in {name} are missing. "
            "Check whether the gaps are expected before relying on this column.",
            [name],
            [_metric("Missing values", count, "count"), _metric("Missing", missing, "percent")],
        )
    ]


def _possible_duplicates(overview: dict) -> list[dict]:
    count = overview["duplicateRowCount"]
    if count == 0:
        return []

    duplicate_percent = overview["duplicateRowPercent"]
    is_large = duplicate_percent >= THRESHOLDS["duplicate_warning_percent"]
    return [
        _insight(
            "possible_duplicates",
            "warning" if is_large else "info",
            "Possible duplicate rows",
            f"{count:,} rows repeat an earlier row exactly. "
            "Totals and averages may be inflated if these are accidental copies.",
            [],
            [
                _metric("Duplicate rows", count, "count"),
                _metric("Of all rows", duplicate_percent, "percent"),
            ],
        )
    ]


def _constant_column(column: dict, row_count: int) -> list[dict]:
    if column["uniqueCount"] != 1 or row_count < 2:
        return []

    name = column["name"]
    return [
        _insight(
            "constant_column",
            "warning",
            f"{name} never changes",
            f"Every value in {name} is the same, so it adds nothing to an analysis.",
            [name],
            [_metric("Distinct values", 1, "count")],
        )
    ]


def _mixed_types(column: dict) -> list[dict]:
    count = column["invalidCount"]
    if count == 0:
        return []

    name = column["name"]
    description = INVALID_DESCRIPTIONS[column["type"]]
    verb = "was" if count == 1 else "were"
    return [
        _insight(
            "mixed_types",
            "warning",
            f"Unexpected values in {name}",
            f"{_count(count, 'value')} in {name} could not be read as {description} "
            f"and {verb} left out of its statistics.",
            [name],
            [_metric("Invalid values", count, "count")],
        )
    ]


def _heavy_skew(column: dict) -> list[dict]:
    if column["type"] != "numeric":
        return []

    stats = column["stats"]
    skewness = stats["skewness"]
    if skewness is None or abs(skewness) < THRESHOLDS["heavy_skew"]:
        return []

    name = column["name"]
    is_right = skewness > 0
    tail = "high" if is_right else "low"
    side = "above" if is_right else "below"
    return [
        _insight(
            "heavy_skew",
            "warning",
            f"Heavy skew in {name}",
            f"{name} is strongly {'right' if is_right else 'left'}-skewed: a tail of {tail} "
            f"values pulls the mean ({_readable(stats['mean'])}) {side} the median "
            f"({_readable(stats['median'])}). The median better describes a typical value.",
            [name],
            [
                _metric("Skewness", skewness, "number"),
                _metric("Mean", stats["mean"], "number"),
                _metric("Median", stats["median"], "number"),
            ],
        )
    ]


def _many_outliers(column: dict) -> list[dict]:
    if column["type"] != "numeric":
        return []

    outliers = column["stats"]["outliers"]
    if outliers["percent"] < THRESHOLDS["many_outliers_percent"]:
        return []

    name = column["name"]
    return [
        _insight(
            "many_outliers",
            "warning",
            f"Many outliers in {name}",
            f"{_count(outliers['count'], 'value')} in {name} "
            f"{'falls' if outliers['count'] == 1 else 'fall'} outside the expected range of "
            f"{_readable(outliers['lowerFence'])} to {_readable(outliers['upperFence'])}. "
            "They may be errors or genuine extreme cases.",
            [name],
            [
                _metric("Outliers", outliers["count"], "count"),
                _metric("Of valid values", outliers["percent"], "percent"),
            ],
        )
    ]


def _datetime_as_text(column: ParsedColumn) -> list[dict]:
    """Every CSV date is text, so only flag dates that are not in plain ISO format."""
    formats = column.date_formats
    if column.type != "datetime" or formats == ["ISO 8601"]:
        return []

    name = column.name
    format_list = ", ".join(formats)
    is_mixed = len(formats) > 1
    message = (
        f"{name} mixes date formats ({format_list}), so it sorts and filters "
        "incorrectly as text."
        if is_mixed
        else f"{name} stores dates as {format_list} text, which sorts incorrectly "
        "until it is converted."
    )
    return [
        _insight(
            "datetime_as_text",
            "warning" if is_mixed else "info",
            f"Dates stored as text in {name}",
            f"{message} Convert it to a real date type before analysis.",
            [name],
            [_metric("Date formats found", len(formats), "count")],
        )
    ]


def _high_cardinality(column: dict) -> list[dict]:
    unique_count = column["uniqueCount"]
    if column["type"] != "categorical":
        return []
    if unique_count < THRESHOLDS["high_cardinality_unique"]:
        return []

    name = column["name"]
    return [
        _insight(
            "high_cardinality",
            "info",
            f"Many categories in {name}",
            f"{name} has {unique_count:,} distinct values, which is too many to group "
            "or chart usefully without combining them.",
            [name],
            [
                _metric("Distinct values", unique_count, "count"),
                _metric("Unique", column["uniquePercent"], "percent"),
            ],
        )
    ]


def _strong_correlations(correlations: dict) -> list[dict]:
    insights = []
    for pair in correlations["topPairs"]:
        is_strong = abs(pair["r"]) >= THRESHOLDS["strong_correlation_r"]
        if not is_strong or pair["pairCount"] < THRESHOLDS["strong_correlation_min_pairs"]:
            continue

        first, second = pair["columnA"], pair["columnB"]
        movement = "rise together" if pair["r"] > 0 else "move in opposite directions"
        insights.append(
            _insight(
                "strong_correlation",
                "info",
                f"Strong correlation between {first} and {second}",
                f"{first} and {second} tend to {movement} across {pair['pairCount']:,} rows. "
                "Correlation alone does not show that one causes the other.",
                [first, second],
                [
                    _metric("Pearson r", pair["r"], "number"),
                    _metric("Rows compared", pair["pairCount"], "count"),
                ],
            )
        )
    return insights


def _likely_id(column: dict) -> list[dict]:
    if column["type"] != "id":
        return []

    name = column["name"]
    unique = column["uniquePercent"]
    return [
        _insight(
            "likely_id",
            "info",
            f"{name} looks like an identifier",
            f"{unique:g}% of the values in {name} are unique, so it identifies rows "
            "and was left out of numeric analysis.",
            [name],
            [_metric("Unique", unique, "percent")],
        )
    ]
