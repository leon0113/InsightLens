"""Profile a CSV file and print one JSON report on stdout.

Usage: python profile_dataset.py <path-to-csv>

Exit codes are part of the contract in docs/report_schema.md:
0 means the report is on stdout, 1 means stderr holds a message safe to show
the user, and anything else is an unexpected failure.
"""

import json
import sys
import traceback

from eda.errors import EngineError
from eda.report import build_report

EXPECTED_FAILURE = 1
UNEXPECTED_FAILURE = 2


def main(arguments: list[str]) -> int:
    """Run the engine and return the process exit code."""
    if len(arguments) != 1:
        print("Usage: python profile_dataset.py <path-to-csv>", file=sys.stderr)
        return UNEXPECTED_FAILURE

    try:
        report = build_report(arguments[0])
        # allow_nan=False turns any NaN that slips through into a failure,
        # instead of output that JSON.parse would reject.
        output = json.dumps(report, allow_nan=False, separators=(",", ":"))
    except EngineError as error:
        print(error, file=sys.stderr)
        return EXPECTED_FAILURE
    except Exception:
        traceback.print_exc()
        return UNEXPECTED_FAILURE

    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
