"""Shared test helpers."""

from pathlib import Path
from typing import Callable

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def write_csv(tmp_path: Path) -> Callable[..., str]:
    """Write CSV text to a temporary file and return its path."""

    def write(text: str, encoding: str = "utf-8", name: str = "data.csv") -> str:
        path = tmp_path / name
        path.write_bytes(text.encode(encoding))
        return str(path)

    return write
