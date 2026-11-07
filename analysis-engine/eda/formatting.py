"""Turn computed values into the rounded, JSON-safe form the report uses."""

import math


def clean_number(value: float, digits: int = 6) -> float | None:
    """Round a number, returning None for NaN and infinity."""
    number = float(value)
    return round(number, digits) if math.isfinite(number) else None


def percent(part: int | float, whole: int | float) -> float:
    """Return part as a percentage of whole, rounded to 2 decimals."""
    return round(100 * float(part) / float(whole), 2) if whole else 0.0


def truncate(text: str, limit: int) -> str:
    """Cut text to at most limit characters, ending in '...' when shortened."""
    return text if len(text) <= limit else f"{text[: limit - 3]}..."
