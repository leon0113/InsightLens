"""Infer each column's type and parse its values into that type."""

import math
import re
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from eda.config import THRESHOLDS

BOOLEAN_PAIRS = (
    ("true", "false"),
    ("yes", "no"),
    ("y", "n"),
    ("t", "f"),
    ("1", "0"),
)
# Names that suggest an identifier. Values must still be unique.
# order_id, ticket no, Invoice-Number: any case, after a separator or alone.
ID_NAME_WORD = re.compile(
    r"(?:^|[_\s-])(?:id|uuid|guid|key|no|num|number|ref)$", re.IGNORECASE
)
# customerId, orderNo: case-sensitive, so words like "paid" or "casino" do not match.
ID_NAME_CAMEL = re.compile(r"[a-z](?:Id|ID|No|Num|Number|Ref)$")
ISO_FORMAT = "ISO8601"
# Format code -> the name shown to users in insights.
DATETIME_FORMATS = {
    ISO_FORMAT: "ISO 8601",
    "%Y/%m/%d": "YYYY/MM/DD",
    "%m/%d/%Y": "MM/DD/YYYY",
    "%d/%m/%Y": "DD/MM/YYYY",
    "%m/%d/%y": "MM/DD/YY",
    "%d/%m/%y": "DD/MM/YY",
    "%m/%d/%Y %H:%M": "MM/DD/YYYY HH:MM",
    "%m/%d/%Y %H:%M:%S": "MM/DD/YYYY HH:MM:SS",
    "%d/%m/%Y %H:%M": "DD/MM/YYYY HH:MM",
    "%d/%m/%Y %H:%M:%S": "DD/MM/YYYY HH:MM:SS",
    "%d-%m-%Y": "DD-MM-YYYY",
    "%m-%d-%Y": "MM-DD-YYYY",
    "%d.%m.%Y": "DD.MM.YYYY",
    "%d %b %Y": "DD Mon YYYY",
    "%d-%b-%Y": "DD-Mon-YYYY",
    "%d %B %Y": "DD Month YYYY",
    "%b %d, %Y": "Mon DD, YYYY",
    "%B %d, %Y": "Month DD, YYYY",
}
# Rows checked to choose a date format. Keeps a long column from being parsed once per format.
FORMAT_PROBE_ROWS = 1000


@dataclass
class ParsedColumn:
    """A column after inference. `valid` holds parsed values with their row labels."""

    name: str
    type: str
    raw: pd.Series
    valid: pd.Series
    date_formats: list[str] = field(default_factory=list)

    @property
    def invalid_count(self) -> int:
        return len(self.raw) - len(self.valid)


def infer_column(name: str, series: pd.Series) -> ParsedColumn:
    """Classify a column of strings. The checks run from most to least specific."""
    raw = series.dropna()
    if raw.empty:
        return ParsedColumn(name, "categorical", raw, raw)

    booleans = parse_boolean(raw)
    if _parses_enough(booleans, raw):
        return ParsedColumn(name, "boolean", raw, booleans)

    if _has_id_name(name, raw) or _is_digit_id(raw):
        return ParsedColumn(name, "id", raw, raw)

    numbers = parse_numeric(raw)
    if _parses_enough(numbers, raw):
        return ParsedColumn(name, "numeric", raw, numbers)

    dates, formats = parse_datetime(raw)
    if _parses_enough(dates, raw):
        return ParsedColumn(name, "datetime", raw, dates, formats)

    if _is_code_id(raw):
        return ParsedColumn(name, "id", raw, raw)
    if _is_free_text(raw):
        return ParsedColumn(name, "text", raw, raw)
    return ParsedColumn(name, "categorical", raw, raw)


def _parses_enough(parsed: pd.Series, raw: pd.Series) -> bool:
    return len(parsed) / len(raw) >= THRESHOLDS["type_parse_min_share"]


def parse_boolean(raw: pd.Series) -> pd.Series:
    """Parse the recognised pair that covers the most values. Both sides must appear."""
    tokens = raw.str.strip().str.lower()
    best = pd.Series(dtype=bool)
    for true_token, false_token in BOOLEAN_PAIRS:
        is_true = tokens == true_token
        is_false = tokens == false_token
        matched = is_true[is_true | is_false]
        if is_true.any() and is_false.any() and len(matched) > len(best):
            best = matched
    return best


def parse_numeric(raw: pd.Series) -> pd.Series:
    """Parse numbers, dropping anything that is not a finite value."""
    numbers = pd.to_numeric(raw.str.strip(), errors="coerce").astype(float)
    return numbers[np.isfinite(numbers)]


def parse_datetime(raw: pd.Series) -> tuple[pd.Series, list[str]]:
    """Parse dates using the known formats, so a column may mix several of them.

    Each round picks the format matching the most of the remaining values. That
    also settles MM/DD against DD/MM, because the format matching more values wins.
    """
    remaining = raw.str.strip()
    parsed_parts = []
    formats = []
    candidates = list(DATETIME_FORMATS)

    while not remaining.empty and candidates:
        probe = remaining.head(FORMAT_PROBE_ROWS)
        best = max(candidates, key=lambda code: _to_datetime(probe, code).notna().sum())
        if _to_datetime(probe, best).notna().sum() == 0:
            break
        dates = _to_datetime(remaining, best).dropna()
        parsed_parts.append(dates)
        formats.append(DATETIME_FORMATS[best])
        candidates.remove(best)
        remaining = remaining.drop(dates.index)

    if not parsed_parts:
        return pd.Series(dtype="datetime64[us]"), []

    parsed = pd.concat(parsed_parts).sort_index()
    years = parsed.dt.year
    in_range = years.between(THRESHOLDS["datetime_min_year"], THRESHOLDS["datetime_max_year"])
    return parsed[in_range], formats


def _to_datetime(values: pd.Series, code: str) -> pd.Series:
    """Parse with one format. ISO values with a timezone are converted to UTC."""
    if code == ISO_FORMAT:
        dates = pd.to_datetime(values, format=code, errors="coerce", utc=True)
        return dates.dt.tz_localize(None)
    return pd.to_datetime(values, format=code, errors="coerce")


def _unique_share(raw: pd.Series) -> float:
    return raw.nunique() / len(raw)


def _has_id_name(name: str, raw: pd.Series) -> bool:
    name = name.strip()
    has_id_name = ID_NAME_WORD.search(name) or ID_NAME_CAMEL.search(name)
    return _unique_share(raw) >= THRESHOLDS["id_min_unique_share"] and bool(has_id_name)


def _is_digit_id(raw: pd.Series) -> bool:
    """Digits that identify rather than measure: very long or zero-padded."""
    text = raw.str.strip()
    if _unique_share(raw) < THRESHOLDS["id_min_unique_share"]:
        return False
    if not text.str.fullmatch(r"\d+").all():
        return False

    is_long = text.str.len().max() >= THRESHOLDS["id_min_digit_length"]
    is_padded = text.str.fullmatch(r"0\d+").any()
    return bool(is_long or is_padded)


def _is_code_id(raw: pd.Series) -> bool:
    """Unique codes such as ORD-1001: no spaces, with both letters and digits."""
    if _unique_share(raw) < THRESHOLDS["id_min_unique_share"]:
        return False
    text = raw.str.strip()
    is_single_word = text.str.fullmatch(r"\S+").all()
    return bool(
        is_single_word
        and text.str.contains(r"\d").all()
        and text.str.contains(r"[A-Za-z]").all()
    )


def _is_free_text(raw: pd.Series) -> bool:
    return (
        _unique_share(raw) >= THRESHOLDS["text_min_unique_share"]
        and raw.str.len().mean() >= THRESHOLDS["text_min_mean_length"]
    )


def histogram_bin_count(count: int, unique_count: int, max_bins: int) -> int:
    """Sturges' rule, capped by the limit and by how many distinct values exist."""
    sturges = math.ceil(math.log2(count)) + 1
    return min(sturges, unique_count, max_bins)
