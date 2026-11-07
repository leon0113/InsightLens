# InsightLens

Upload a CSV and get an exploratory data analysis report: a profile of every
column, missing values, distributions, correlations and plain-language
insights, each with the numbers behind it.

![Report overview for the clinic appointments demo](docs/screenshots/report-overview.png)

InsightLens is a portfolio project that combines a full stack web app
(Next.js, Express, MongoDB) with a data analysis engine (Python, pandas). The
engine does all the statistics, the API stores and serves the results, and the
frontend only displays them.

## What it does

- **Reads messy files.** Detects the delimiter (`,` `;` tab `|`) and the text
  encoding (UTF-8, UTF-16, Windows-1252, Latin-1), skips malformed lines and
  says how many it skipped.
- **Infers a type for every column:** numeric, categorical, date and time,
  boolean, free text or identifier. Values that do not fit the type, such as
  `pending` in a price column, are counted and left out of the statistics.
- **Profiles each column** with statistics that fit its type: mean, median,
  quartiles, skewness, outliers and a histogram for numbers; most common
  values for categories; the range and rows per month for dates.
- **Finds problems worth checking** and explains them in plain English, ranked
  by severity: high missing rates, likely ID columns, constant columns, strong
  correlations, heavy skew, many outliers, too many categories, duplicate
  rows, dates stored as text and values of the wrong type.
- **Handles large files.** Files over 200,000 rows use a fixed random sample
  for histograms and correlations, and the report says so. Everything else is
  computed from every row.
- **Keeps reports small.** Histograms are binned, category lists are capped
  at ten values and the preview at 100 rows, so a report stays well under
  MongoDB's 16 MB document limit. The 520,000-row test file produced an 18 KB
  report.

The report has seven tabs: Overview, Insights, Columns, Missing values,
Distributions, Correlations and Data preview. Three demo reports, built from
the sample datasets, can be opened without an account.

| | |
|---|---|
| ![Distributions in dark mode](docs/screenshots/report-distributions-dark.png) | ![Correlation heatmap and strongest pairs](docs/screenshots/report-correlations.png) |
| ![Insights ranked by severity](docs/screenshots/report-insights.png) | ![Landing page](docs/screenshots/landing.png) |

<p align="center">
  <img src="docs/screenshots/mobile-missing.png" alt="Missing values tab on a phone" width="260">
</p>

## Architecture

```mermaid
flowchart LR
  B[Browser<br>Next.js app] -- "REST + JSON<br>access token, refresh cookie" --> A[Express API<br>TypeScript]
  A -- Mongoose --> M[(MongoDB<br>users, datasets, reports)]
  A -- "spawn: python profile_dataset.py file.csv" --> P[Analysis engine<br>Python, pandas]
  P -- "one JSON report on stdout" --> A
```

1. The browser uploads a CSV. The API saves it to `backend/uploads/`, creates a
   dataset with the status `processing` and answers `202 Accepted` at once.
2. In the background the API starts the Python engine as a child process with
   the file path, with a time limit.
3. The engine prints one JSON report. The API checks it against a Zod schema,
   saves it, sets the dataset to `ready` (or `failed`, with a message the user
   can read) and deletes the uploaded file in every case.
4. The browser checks the dataset's status every two seconds and opens the
   report when it is ready.

The design decisions and their trade-offs are in
[docs/architecture.md](docs/architecture.md).

| Part | Stack |
|---|---|
| `frontend/` | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, Recharts, react-dropzone, Vitest |
| `backend/` | Express 4, TypeScript, Mongoose 8, Zod, JWT, Multer, express-rate-limit, Vitest, Supertest |
| `analysis-engine/` | Python 3.11, pandas, NumPy, pytest |

## The report contract

The engine and the API agree on one JSON format, documented field by field in
[docs/report_schema.md](docs/report_schema.md) and checked by tests on both
sides. In outline:

```ts
type Report = {
  schemaVersion: '1.1';
  generatedAt: string;
  source: { sizeBytes; encoding; delimiter; skippedLineCount };
  sampling: { used; totalRows; sampledRows; seed };
  overview: { rowCount; columnCount; missingPercent; duplicateRowCount; columnTypeCounts; ... };
  columns: Column[];          // type decides the shape of each column's stats
  missing: { columnsWithMissing; completeRowCount; byColumn };
  correlations: { method: 'pearson'; columns; matrix; topPairs; omittedColumnCount };
  insights: { rule; severity; title; message; columns; metrics }[];
  preview: { columns; rows };  // first 100 rows
};
```

Exit codes: `0` means the report is on stdout, `1` means the file could not be
analyzed (the message on stderr is shown to the user), and anything else is a
crash, which the user sees as a generic message.

## Run it locally on Windows

You need:

- Node.js 20 or newer (developed on Node 25)
- Python 3.11 or newer (the `py` launcher)
- MongoDB with transactions: a free MongoDB Atlas cluster, or a local MongoDB
  started as a single-node replica set (see below)

All commands are for cmd, run from the repository root.

### 1. Analysis engine

```bat
cd analysis-engine
py -3.11 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python -m pytest
cd ..
```

### 2. Backend

```bat
cd backend
copy .env.example .env
npm install
```

Open `backend\.env` and fill in:

- `DATABASE_URL`: your Atlas connection string with a database name, for
  example `mongodb+srv://user:password@cluster0.abcde.mongodb.net/insightlens?retryWrites=true`.
  In Atlas, also allow your IP address under Network Access.
- `JWT_SECRET` and `JWT_REFRESH_SECRET`: two different long random strings.
  This prints one:

  ```bat
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

The Python paths already point at the engine's virtual environment. Then:

```bat
npm run dev
```

The API runs on http://localhost:5000. It builds the three demo reports in
the background at startup, which takes a few seconds.

**Local MongoDB instead of Atlas.** Saving a report uses a transaction, and
MongoDB only allows transactions on a replica set. A single local node is
enough:

```bat
mkdir C:\data\rs0
mongod --replSet rs0 --dbpath C:\data\rs0 --port 27017
```

In a second terminal, run `mongosh --eval "rs.initiate()"` once, then use
`DATABASE_URL=mongodb://localhost:27017/insightlens?replicaSet=rs0`.

### 3. Frontend

In a new terminal:

```bat
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The demo reports work without an account; create
one to upload your own files.

### Tests and checks

| Where | Command | What it covers |
|---|---|---|
| `analysis-engine` | `python -m pytest` | Reading, type inference, statistics, insight rules, the documented example report |
| `backend` | `npm test` | Auth, ownership, upload to report, failed and timed-out analyses, rate limit, demo endpoints |
| `frontend` | `npm test` | Formatting, the API client's token refresh, the redirect guard, upload checks, report tabs |

Backend tests start an in-memory MongoDB replica set and run the real Python
engine, so they need no Atlas connection. The first run downloads a MongoDB
binary. Each project also has `npm run lint`, `npm run typecheck` and a
Prettier check.

## Sample datasets

The three files in `sample-data/` are **synthetic**. They were generated by
`sample-data/generate_samples.py` with a fixed seed, and none of the rows
describe real people, orders or machines. Each one contains problems on
purpose, so the demo has something to find:

| File | Rows | What it shows |
|---|---|---|
| `ecommerce_orders.csv` | 5,060 | Two date formats in one column, 60 duplicate rows, prices written as text, a long tail of order values |
| `clinic_appointments.csv` | 3,000 | Unknown ages coded as `999`, a column that never changes, missing visit reasons, linked blood pressure readings |
| `sensor_readings.csv` | 7,988 | Semicolon separated, Windows-1252 encoded, error codes in numeric columns, 12 malformed lines |

## Performance

Measured on a Windows laptop with the production frontend build and Atlas
free tier as the database:

| File | Size | Engine | Upload to report on screen | Note |
|---|---|---|---|---|
| 520,000 rows, 9 columns | 24.5 MB | 11.6 s | 14.0 s | Sampled 200,000 rows for charts; report 18 KB |
| 3,000 rows, 71 columns | 1.4 MB | 1.9 s | 2.8 s | Correlation matrix capped at 50 columns; report 193 KB |

Report tabs render in under 0.3 s. The exception is Distributions for the
wide file, which draws 70 histograms; it took about 1 s on one run and under
0.2 s on another.

## Accessibility

- Full keyboard use: a skip link, visible focus on every control, arrow keys
  between report tabs, and scrollable tables reachable by keyboard.
- Text contrast of at least 4.5:1 for every color pair in both themes.
- Charts have text descriptions, and every chart value is also available as
  text in a table or list.
- An automated axe-core audit of every page and report tab, in light and dark
  mode, reports no violations.

## Limitations

- **One API process.** Analyses run as child processes of the API, not
  through a job queue. If the server restarts mid-analysis, that dataset is
  marked as failed at the next startup. The upload rate limit is also kept in
  memory, so several API instances would each count separately.
- **Memory.** pandas loads the whole file, which needs several times the file
  size in memory. Uploads are limited to 50 MB.
- **Linear correlation only.** Pearson's r misses relationships that are
  strong but not straight lines.
- **Heuristic types.** Type inference follows documented rules and can be
  wrong for unusual columns, and the user cannot override it yet. Booleans
  are recognized from English pairs (true/false, yes/no, t/f, y/n) and 1/0.
- **Sessions.** Logging out clears the refresh cookie but does not revoke the
  token on the server. There is no email verification, password reset or
  change-password screen yet; the change-password endpoint exists in the API.

## Next steps

- Let users override a column's detected type and re-run the analysis
- Spearman correlation next to Pearson
- Compare two reports, such as this month's export against last month's
- Export a report as a self-contained HTML file
- Refresh token rotation with server-side revocation
- A job queue and shared rate limit store, for running more than one API instance

## How this was built: an AI coding agent, under my direction

I built InsightLens with Claude Code, an AI coding agent, as part of the
workflow. I did not hand it the whole project and accept whatever it
produced. The agent wrote most of the code; I set the direction, made the
decisions and checked the results.

**What I did**

- **Wrote the specifications first.** [CLAUDE.md](CLAUDE.md) defines the
  product, architecture, report contents, quality bar and what not to do.
  [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) defines the backend layout,
  layers, naming, error handling and a definition of done. The agent had to
  follow both.
- **Split the work into six phases** (contract and setup, analysis engine,
  backend, design, frontend features, polish and docs). Before each phase the
  agent proposed a plan and waited for my approval; after each phase it
  stopped for my review.
- **Made the decisions.** For example: the JSON contract between Python and
  Node before any code, MongoDB Atlas, the email address as the user id,
  treating 0/1 columns as booleans, flagging dates stored as text, the three
  sample data domains, the visual direction, and a contract change (version
  1.1) that adds a focused histogram for outliers. Where I delegated a choice,
  such as the brand colors, I reviewed the result before approving it.
- **Required proof, not claims.** Every phase ended with tests, lint and type
  checks run from cmd, plus checks in a real browser for the frontend. The
  report contract is tested on both sides: pytest checks that the engine
  reproduces the documented example, and the backend validates every report
  with a Zod schema.

**What the agent did**

- Wrote the code within those rules and explained it in plain terms after
  each phase, so that I can explain and defend every part of it.
- Generated the synthetic sample data. The script
  `sample-data/generate_samples.py` follows my brief (three domains, each with
  realistic problems to find) and uses a fixed seed. No real personal or
  company data is used anywhere.
- Found and fixed bugs during verification, such as a relative file path the
  Python process could not resolve and a chart axis that did not render. Each
  fix was reported to me with its cause.

**What the agent was not allowed to do**: run git (I review and commit every
change myself), add services beyond the agreed stack, store uploaded files
after analysis, or compute statistics anywhere other than the Python engine.

## Author

Built by Leon.
