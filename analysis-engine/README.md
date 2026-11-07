# Analysis engine

Python script that profiles a CSV and prints one JSON report. The output is
defined in [docs/report_schema.md](../docs/report_schema.md).

## Setup (Windows cmd)

Requires Python 3.11 or newer. Run from the repository root:

```bat
cd analysis-engine
py -3.11 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
```

To confirm it worked:

```bat
python -c "import pandas, numpy; print(pandas.__version__, numpy.__version__)"
```

This prints `3.1.1 2.4.6`.

Run `.venv\Scripts\activate.bat` again in each new terminal. The backend does
not need this, because `PYTHON_BIN` in `backend/.env` points straight at the
venv's Python.

## Usage

With the venv active, from `analysis-engine/`:

```bat
python profile_dataset.py ..\sample-data\clinic_appointments.csv > report.json
python -m pytest
```

To rebuild the sample CSVs, which are always the same because the seed is fixed:

```bat
python ..\sample-data\generate_samples.py
```

## Layout

| File | Job |
|---|---|
| `profile_dataset.py` | Entry point: exit codes and JSON output |
| `eda/reader.py` | Encoding and delimiter detection, malformed lines |
| `eda/types.py` | Type inference and parsing |
| `eda/stats.py` | Per-column statistics and histograms |
| `eda/missing.py` | Missing value summary |
| `eda/correlations.py` | Pearson matrix and top pairs |
| `eda/insights.py` | Rule-based insights |
| `eda/report.py` | Builds the report, sampling and preview |
| `eda/config.py` | Every threshold and size limit |
