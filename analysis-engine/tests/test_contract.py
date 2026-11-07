"""The engine's output must match docs/report_schema.md exactly."""

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

from eda import config
from eda.report import build_report
from tests.conftest import FIXTURES

ENGINE_DIR = Path(__file__).parent.parent
SCHEMA_DOC = ENGINE_DIR.parent / "docs" / "report_schema.md"
SAMPLE_DATA = ENGINE_DIR.parent / "sample-data"
VARIES_BY_RUN = ("generatedAt", "memoryBytes")


def documented_example() -> dict:
    text = SCHEMA_DOC.read_text(encoding="utf-8")
    return json.loads(re.search(r"```json\n(.*?)```", text, re.S).group(1))


def without_run_values(report: dict) -> dict:
    copy = json.loads(json.dumps(report))
    copy.pop("generatedAt")
    copy["overview"].pop("memoryBytes")
    return copy


def run_engine(*arguments: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "profile_dataset.py", *arguments],
        cwd=ENGINE_DIR,
        capture_output=True,
    )


def test_engine_reproduces_documented_example():
    report = build_report(str(FIXTURES / "contract_example.csv"))

    assert without_run_values(report) == without_run_values(documented_example())


def same_shape(actual: object, documented: object) -> bool:
    """Compare two reports by their keys only.

    Only objects are compared, so a nullable object such as focusedHistogram
    matches whether it is null on either side or not.
    """
    if isinstance(actual, dict) and isinstance(documented, dict):
        return actual.keys() == documented.keys() and all(
            same_shape(actual[key], documented[key]) for key in actual
        )
    return True


@pytest.mark.parametrize(
    "name", ["ecommerce_orders.csv", "clinic_appointments.csv", "sensor_readings.csv"]
)
def test_sample_reports_have_the_documented_shape(name):
    example = documented_example()
    report = build_report(str(SAMPLE_DATA / name))
    example_columns = {column["type"]: column for column in example["columns"]}

    assert set(report) == set(example)
    for section in ("source", "sampling", "overview", "missing", "correlations", "preview"):
        assert same_shape(report[section], example[section]), section
    for column in report["columns"]:
        documented = example_columns[column["type"]]
        assert same_shape(column, documented), column["name"]
    for insight in report["insights"]:
        assert set(insight) == set(example["insights"][0])


def test_cli_success_prints_ascii_json_only():
    path = FIXTURES / "semicolon_cp1252.csv"
    result = run_engine(str(path))

    assert result.returncode == 0
    assert result.stdout.isascii()
    report = json.loads(result.stdout)
    assert report["preview"]["columns"][1] == "temperature_°c"


def test_cli_expected_failure_exits_with_one_line_message(tmp_path):
    empty = tmp_path / "empty.csv"
    empty.write_text("a,b\n", encoding="utf-8")
    result = run_engine(str(empty))

    assert result.returncode == 1
    assert result.stdout == b""
    assert result.stderr.decode().strip() == "The file has a header but no data rows."


def test_cli_usage_error_is_not_an_expected_failure():
    result = run_engine()

    assert result.returncode == 2
    assert result.stdout == b""


def test_large_files_are_sampled(write_csv, monkeypatch):
    monkeypatch.setitem(config.LIMITS, "sample_rows", 50)
    rows = "\n".join(f"{n},{n * 2}" for n in range(200))
    report = build_report(write_csv(f"a,b\n{rows}\n"))

    assert report["sampling"] == {"used": True, "totalRows": 200, "sampledRows": 50, "seed": 42}
    assert report["columns"][0]["stats"]["count"] == 200
    assert sum(b["count"] for b in report["columns"][0]["stats"]["histogram"]) == 50
    assert report["correlations"]["topPairs"][0]["pairCount"] == 50


def test_small_files_are_not_sampled(write_csv):
    report = build_report(write_csv("a\n1\n2\n"))

    assert report["sampling"] == {"used": False, "totalRows": 2, "sampledRows": 2, "seed": None}


def test_preview_is_capped_and_cells_truncated(write_csv):
    rows = "\n".join(f"{n},{'y' * 250}" for n in range(150))
    preview = build_report(write_csv(f"n,long\n{rows}\n"))["preview"]

    assert len(preview["rows"]) == 100
    assert len(preview["rows"][0][1]) == 200
    assert preview["rows"][0][1].endswith("...")
