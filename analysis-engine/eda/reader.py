"""Read a CSV file of unknown encoding and delimiter into a DataFrame of strings."""

import codecs
import csv
import os
import warnings
from dataclasses import dataclass

import pandas as pd

from eda.errors import EngineError

BOMS = {
    codecs.BOM_UTF8: "utf-8-sig",
    codecs.BOM_UTF16_LE: "utf-16",
    codecs.BOM_UTF16_BE: "utf-16",
}
FALLBACK_ENCODINGS = ("utf-8", "cp1252")
DELIMITERS = (",", ";", "\t", "|")
READ_CHUNK_BYTES = 1024 * 1024
SNIFF_BYTES = 64 * 1024
SNIFF_LINES = 50


@dataclass
class LoadedFile:
    """A parsed file plus what was learned while reading it."""

    frame: pd.DataFrame
    size_bytes: int
    encoding: str
    delimiter: str
    skipped_line_count: int


def load_csv(path: str) -> LoadedFile:
    """Load a CSV as strings, so that each column's type can be inferred later."""
    try:
        size_bytes = os.path.getsize(path)
        encoding = detect_encoding(path)
        delimiter = detect_delimiter(path, encoding)
        frame, skipped = _read_frame(path, encoding, delimiter)
    except OSError as error:
        raise EngineError("The file could not be read.") from error

    if frame.columns.empty:
        raise EngineError("The file has no columns.")
    if frame.empty:
        raise EngineError("The file has a header but no data rows.")

    return LoadedFile(_blank_to_missing(frame), size_bytes, encoding, delimiter, skipped)


def detect_encoding(path: str) -> str:
    """Use the byte order mark if there is one, otherwise the first encoding that fits."""
    with open(path, "rb") as file:
        start = file.read(SNIFF_BYTES)

    for bom, encoding in BOMS.items():
        if start.startswith(bom):
            return encoding

    if b"\x00" in start:
        raise EngineError("The file is not a text CSV.")

    for encoding in FALLBACK_ENCODINGS:
        if _decodes_as(path, encoding):
            return encoding
    return "latin-1"


def _decodes_as(path: str, encoding: str) -> bool:
    """Check a whole file in chunks, without loading it all into memory."""
    decoder = codecs.getincrementaldecoder(encoding)()
    try:
        with open(path, "rb") as file:
            while chunk := file.read(READ_CHUNK_BYTES):
                decoder.decode(chunk)
            decoder.decode(b"", final=True)
    except UnicodeDecodeError:
        return False
    return True


def detect_delimiter(path: str, encoding: str) -> str:
    """Pick the delimiter that splits the first lines into the most consistent columns."""
    with open(path, encoding=encoding, errors="replace", newline="") as file:
        lines = file.read(SNIFF_BYTES).splitlines()[:SNIFF_LINES]

    best_delimiter = ","
    best_score = (0.0, 0)
    for delimiter in DELIMITERS:
        widths = _row_widths(lines, delimiter)
        if not widths or widths[0] < 2:
            continue
        score = (sum(width == widths[0] for width in widths) / len(widths), widths[0])
        if score > best_score:
            best_delimiter, best_score = delimiter, score
    return best_delimiter


def _row_widths(lines: list[str], delimiter: str) -> list[int]:
    """Count the fields in each line, or return nothing if the lines cannot be parsed."""
    try:
        return [len(row) for row in csv.reader(lines, delimiter=delimiter) if row]
    except csv.Error:
        return []


def _read_frame(path: str, encoding: str, delimiter: str) -> tuple[pd.DataFrame, int]:
    """Parse the file, counting the malformed lines that pandas skips."""
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            frame = pd.read_csv(
                path,
                sep=delimiter,
                encoding=encoding,
                dtype=str,
                index_col=False,
                on_bad_lines="warn",
            )
    except pd.errors.EmptyDataError as error:
        raise EngineError("The file is empty.") from error
    except (pd.errors.ParserError, UnicodeError) as error:
        raise EngineError("The file could not be parsed as a CSV.") from error

    skipped = sum(str(warning.message).count("Skipping line") for warning in caught)
    return frame, skipped


def _blank_to_missing(frame: pd.DataFrame) -> pd.DataFrame:
    """Treat whitespace-only cells as missing."""
    return frame.apply(lambda column: column.mask(column.str.strip() == ""))
