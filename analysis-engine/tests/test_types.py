"""Type inference: each column should get the type a person would give it."""

import pandas as pd
import pytest

from eda.types import histogram_bin_count, infer_column, parse_datetime


def infer(values: list, name: str = "column"):
    return infer_column(name, pd.Series(values, dtype="str"))


@pytest.mark.parametrize(
    ("values", "expected"),
    [
        (["1.5", "2", "3.25", "-4", "1e3"], "numeric"),
        (["yes", "no", "Yes", "NO"], "boolean"),
        (["1", "0", "0", "1", "1"], "boolean"),
        (["true", "false", "true"], "boolean"),
        (["2024-01-15", "2024-02-01", "2024-03-30"], "datetime"),
        (["15 Jan 2024", "01 Feb 2024", "30 Mar 2024"], "datetime"),
        (["ORD-1001", "ORD-1002", "ORD-1003"], "id"),
        (["00123", "00124", "00125"], "id"),
        (["North", "South", "North", "East", "South"], "categorical"),
        (
            [
                "The parcel arrived damaged on the left side",
                "Customer asked us to call before delivery",
                "Left at the front door as requested today",
            ],
            "text",
        ),
    ],
)
def test_infers_type(values, expected):
    assert infer(values).type == expected


def test_constant_yes_column_is_not_boolean():
    assert infer(["yes", "yes", "yes"]).type == "categorical"


def test_empty_column_is_categorical():
    column = infer([None, None, None])

    assert column.type == "categorical"
    assert column.raw.empty


def test_id_name_hint_needs_unique_values():
    assert infer(["5", "7", "9"], name="customer_id").type == "id"
    assert infer(["5", "5", "9"], name="customer_id").type == "numeric"


@pytest.mark.parametrize("name", ["ticket_no", "invoice number", "customerRef", "orderId"])
def test_id_name_endings(name):
    assert infer([str(n) for n in range(1, 21)], name=name).type == "id"


@pytest.mark.parametrize("name", ["year", "hours", "paid", "casino", "valid", "Android"])
def test_unique_whole_numbers_without_id_name_stay_numeric(name):
    assert infer([str(n) for n in range(2001, 2021)], name=name).type == "numeric"


def test_numeric_with_a_few_invalid_values_stays_numeric():
    column = infer(["10", "12", "14", "16", "pending"])

    assert column.type == "numeric"
    assert column.invalid_count == 1
    assert column.valid.tolist() == [10.0, 12.0, 14.0, 16.0]


def test_mostly_non_numeric_column_is_not_numeric():
    assert infer(["10", "abc", "def", "ghi", "jkl"]).type != "numeric"


def test_infinity_is_invalid_not_numeric():
    column = infer(["1", "2", "3", "4", "inf"])

    assert column.type == "numeric"
    assert column.invalid_count == 1


def test_mixed_date_formats_are_both_parsed():
    dates, formats = parse_datetime(pd.Series(["2024-01-15", "2024-02-01", "03/14/2024"]))

    assert formats == ["ISO 8601", "MM/DD/YYYY"]
    assert dates.dt.strftime("%Y-%m-%d").tolist() == ["2024-01-15", "2024-02-01", "2024-03-14"]


def test_day_first_dates_win_when_more_of_them_match():
    dates, formats = parse_datetime(pd.Series(["25/01/2024", "13/02/2024", "05/03/2024"]))

    assert formats == ["DD/MM/YYYY"]
    assert dates.dt.month.tolist() == [1, 2, 3]


def test_timezones_are_converted_to_utc():
    dates, _ = parse_datetime(pd.Series(["2024-01-15T10:00:00+02:00"]))

    assert dates.iloc[0] == pd.Timestamp("2024-01-15 08:00:00")


def test_placeholder_dates_are_invalid():
    column = infer(["2024-01-15", "2024-02-01", "2024-03-01", "2024-04-01", "9999-12-31"])

    assert column.type == "datetime"
    assert column.invalid_count == 1


@pytest.mark.parametrize(
    ("count", "unique", "expected"),
    [(6, 6, 4), (1000, 1000, 11), (10_000_000, 10_000_000, 20), (500, 3, 3)],
)
def test_histogram_bin_count(count, unique, expected):
    assert histogram_bin_count(count, unique, 20) == expected
