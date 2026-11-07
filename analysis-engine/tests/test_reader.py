"""Reading files of unknown encoding, delimiter and quality."""

import shutil

import pytest

from eda.errors import EngineError
from eda.reader import load_csv
from tests.conftest import FIXTURES


def test_reads_plain_utf8_csv(write_csv):
    loaded = load_csv(write_csv("a,b\n1,x\n2,y\n"))

    assert loaded.encoding == "utf-8"
    assert loaded.delimiter == ","
    assert list(loaded.frame.columns) == ["a", "b"]
    assert loaded.frame["a"].tolist() == ["1", "2"]


def test_detects_semicolon_and_cp1252(tmp_path):
    path = tmp_path / "europe.csv"
    text = (FIXTURES / "semicolon_cp1252.csv").read_text(encoding="utf-8")
    path.write_bytes(text.encode("cp1252"))

    loaded = load_csv(str(path))

    assert loaded.encoding == "cp1252"
    assert loaded.delimiter == ";"
    assert list(loaded.frame.columns) == ["city", "temperature_°c", "note"]
    assert loaded.frame["city"].tolist() == ["Zürich", "Málaga", "Kraków"]


@pytest.mark.parametrize(
    ("encoding", "expected"),
    [("utf-8-sig", "utf-8-sig"), ("utf-16", "utf-16")],
)
def test_uses_byte_order_mark(write_csv, encoding, expected):
    loaded = load_csv(write_csv("name,value\ncafé,1\n", encoding=encoding))

    assert loaded.encoding == expected
    assert list(loaded.frame.columns) == ["name", "value"]


def test_detects_tab_and_pipe_delimiters(write_csv):
    assert load_csv(write_csv("a\tb\n1\t2\n")).delimiter == "\t"
    assert load_csv(write_csv("a|b|c\n1|2|3\n", name="pipe.csv")).delimiter == "|"


def test_counts_and_skips_malformed_lines(tmp_path):
    path = tmp_path / "bad.csv"
    shutil.copy(FIXTURES / "bad_lines.csv", path)

    loaded = load_csv(str(path))

    assert loaded.skipped_line_count == 2
    assert loaded.frame["name"].tolist() == ["Ana", "Cai", "Eli"]


def test_whitespace_and_null_markers_are_missing(write_csv):
    frame = load_csv(write_csv("a,b\n  ,N/A\nx,NULL\n")).frame

    assert frame["a"].isna().tolist() == [True, False]
    assert frame["b"].isna().tolist() == [True, True]


def test_renames_repeated_and_blank_headers(write_csv):
    frame = load_csv(write_csv("a,a,,b\n1,2,3,4\n")).frame

    assert list(frame.columns) == ["a", "a.1", "Unnamed: 2", "b"]


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "The file is empty."),
        ("a,b\n", "The file has a header but no data rows."),
    ],
)
def test_rejects_files_without_data(write_csv, text, message):
    with pytest.raises(EngineError, match=message):
        load_csv(write_csv(text))


def test_rejects_binary_files(tmp_path):
    path = tmp_path / "image.csv"
    path.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

    with pytest.raises(EngineError, match="not a text CSV"):
        load_csv(str(path))


def test_rejects_missing_file(tmp_path):
    with pytest.raises(EngineError, match="could not be read"):
        load_csv(str(tmp_path / "missing.csv"))
