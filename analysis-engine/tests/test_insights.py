"""Each insight rule fires when it should, and stays quiet when it should not."""

from eda.report import build_report


def rules_for(report: dict, rule: str) -> list[dict]:
    return [insight for insight in report["insights"] if insight["rule"] == rule]


def csv_rows(header: str, rows: list[str]) -> str:
    return header + "\n" + "\n".join(rows) + "\n"


def test_high_missing_rate_severity(write_csv):
    rows = [f"{n},{'' if n < 6 else 'x'},{'' if n < 3 else 'y'}" for n in range(10)]
    report = build_report(write_csv(csv_rows("n,mostly_empty,some_empty", rows)))
    found = {i["columns"][0]: i["severity"] for i in rules_for(report, "high_missing_rate")}

    assert found == {"mostly_empty": "critical", "some_empty": "warning"}


def test_low_missing_rate_is_not_flagged(write_csv):
    rows = [f"{n},{'' if n == 0 else 'x'}" for n in range(10)]
    report = build_report(write_csv(csv_rows("n,value", rows)))

    assert rules_for(report, "high_missing_rate") == []


def test_likely_id(write_csv):
    rows = [f"ORD-{n},{n % 3}" for n in range(10)]
    report = build_report(write_csv(csv_rows("order_id,group", rows)))

    assert [i["columns"] for i in rules_for(report, "likely_id")] == [["order_id"]]


def test_constant_column(write_csv):
    rows = [f"{n},Main" for n in range(5)]
    report = build_report(write_csv(csv_rows("n,site", rows)))

    assert rules_for(report, "constant_column")[0]["columns"] == ["site"]


def test_strong_correlation_mentions_causation(write_csv):
    rows = [f"{n},{n * 2 + (n % 2)}" for n in range(12)]
    report = build_report(write_csv(csv_rows("hours,output", rows)))
    insight = rules_for(report, "strong_correlation")[0]

    assert insight["columns"] == ["hours", "output"]
    assert "does not show that one causes the other" in insight["message"]
    assert insight["metrics"][0]["value"] > 0.99


def test_weak_correlation_is_not_flagged(write_csv):
    rows = ["1,5", "2,1", "3,4", "4,2", "5,5", "6,1", "7,3"]
    report = build_report(write_csv(csv_rows("a,b", rows)))

    assert rules_for(report, "strong_correlation") == []


def test_heavy_skew_and_many_outliers(write_csv):
    values = [10, 11, 12, 10, 11, 12, 10, 11, 12, 10, 11, 12, 10, 11, 400, 500]
    report = build_report(write_csv(csv_rows("amount", [str(v) for v in values])))

    skew = rules_for(report, "heavy_skew")[0]
    outliers = rules_for(report, "many_outliers")[0]
    assert "right-skewed" in skew["message"]
    assert outliers["metrics"][0] == {"label": "Outliers", "value": 2, "unit": "count"}


def test_symmetric_column_has_no_skew_or_outliers(write_csv):
    report = build_report(write_csv(csv_rows("v", [str(v) for v in range(1, 21)])))

    assert rules_for(report, "heavy_skew") == []
    assert rules_for(report, "many_outliers") == []


def test_high_cardinality(write_csv):
    rows = [f"customer {n % 60}" for n in range(120)]
    report = build_report(write_csv(csv_rows("customer", rows)))

    assert rules_for(report, "high_cardinality")[0]["metrics"][0]["value"] == 60


def test_possible_duplicates(write_csv):
    rows = ["1,a", "2,b", "1,a", "3,c"]
    report = build_report(write_csv(csv_rows("n,letter", rows)))
    insight = rules_for(report, "possible_duplicates")[0]

    assert insight["severity"] == "warning"
    assert insight["metrics"][0]["value"] == 1


def test_datetime_as_text_ignores_plain_iso(write_csv):
    rows = ["2024-01-15", "2024-02-01", "2024-03-01"]
    report = build_report(write_csv(csv_rows("day", rows)))

    assert rules_for(report, "datetime_as_text") == []


def test_datetime_as_text_severity(write_csv):
    single = build_report(write_csv(csv_rows("day", ["15 Jan 2024", "01 Feb 2024"])))
    mixed = build_report(
        write_csv(csv_rows("day", ["2024-01-15", "2024-02-01", "03/14/2024"]), name="m.csv")
    )

    assert rules_for(single, "datetime_as_text")[0]["severity"] == "info"
    assert rules_for(mixed, "datetime_as_text")[0]["severity"] == "warning"


def test_mixed_types(write_csv):
    rows = ["10", "12", "14", "16", "pending"]
    report = build_report(write_csv(csv_rows("amount", rows)))
    insight = rules_for(report, "mixed_types")[0]

    assert insight["message"].startswith("1 value in amount could not be read as a number")


def test_insights_are_sorted_by_severity(write_csv):
    rows = [f"ORD-{n},{'' if n < 6 else 'x'},Main" for n in range(10)]
    report = build_report(write_csv(csv_rows("order_id,note,site", rows)))
    order = {"critical": 0, "warning": 1, "info": 2}
    severities = [order[i["severity"]] for i in report["insights"]]

    assert severities == sorted(severities)
    assert len(severities) >= 3
