# Segmentra

**Customer Segmentation & Behavioral Intelligence Platform**

Turn transaction history into customer groups you can explore. Segmentra combines purchase-only RFM features with unsupervised KMeans clustering, then lets you compare profiles, inspect customers and review model quality through a responsive React interface.

![Segmentra Home](docs/screenshots/home.jpg)

[Features](#features) · [Local setup](#local-setup) · [How it works](#how-it-works) · [Dataset](#dataset-and-attribution) · [Deployment](#deployment-status)

## Features

- Upload CSV or XLSX transactions, or run the included Online Retail example.
- Build Recency, Frequency and Monetary profiles with explicit cleaning rules.
- Choose raw RFM scaling or log-transformed scaling, your K, and a candidate evaluation range.
- Compare customer counts, purchase-value contributions, and mean/median RFM by segment.
- Search, sort and filter individual customers; inspect PCA coordinates by customer ID.
- Review silhouette scores, candidate inertia, PCA explained variance and cleaning summaries.
- Download spreadsheet-safe customer and segment CSV exports.
- Explore six responsive pages, with keyboard controls, reduced-motion support and an SVG fallback for the illustrative WebGL Home scene.

## Application preview

Screenshots show the current application. Analytical values come from a real run of the attributed public UCI example; the Home scene is explicitly illustrative.

| Analyze | Segments |
| --- | --- |
| ![Analysis workflow](docs/screenshots/analyze.jpg) | ![Customer segment profiles](docs/screenshots/segments.jpg) |

![Model quality and PCA](docs/screenshots/insights.jpg)

## Technology

| Area | Implementation |
| --- | --- |
| Frontend | React, TypeScript, React Router, Vite; Sora typography and custom responsive CSS |
| Backend | Python, FastAPI, Pydantic, Uvicorn; bounded multipart ingestion |
| Machine learning | pandas, NumPy, scikit-learn: StandardScaler, KMeans, silhouette and PCA |
| Visualization | Custom WebGL/SVG particle scene, Canvas PCA plot, SVG candidate chart and HTML distribution charts |
| File processing | openpyxl with defusedxml for XLSX; PapaParse for preliminary browser CSV preview |
| Testing | pytest and HTTP API tests; Vitest, Testing Library and jsdom |

## How it works

**Transactions → Cleaning → RFM → Preprocessing → KMeans → Evaluation → Exploration**

| Signal | Meaning |
| --- | --- |
| Recency | Whole elapsed days since the latest retained purchase, relative to one day after the dataset's latest retained transaction. |
| Frequency | Distinct purchase invoices per customer. |
| Monetary | Sum of retained positive quantity × unit price. Returns are excluded; this is purchase value, not net revenue. |

The engine removes missing customer IDs, uppercase `C` cancellation invoices, nonpositive quantities/prices and exact duplicate source rows. It scales raw RFM or `log1p(RFM)` before scaling. KMeans uses `k-means++`, seed 42 and 10 initializations.

Candidate K values are compared by valid silhouette scores; your selected K stays independent of the recommendation. Evaluation uses at most 1,000 customers and the same seeded subset for every candidate. PCA provides a two-dimensional view; it is not the clustering input. Profiles and personas describe historical behavior, not churn or revenue predictions.

Open **Methodology** in the app for formulas, sampling rules and analytical caveats. See [API documentation](#api-reference) for request and response details.

## Project structure

```text
customer-segmentation/
├── frontend/
│   ├── src/app/          # Router and shared shell
│   ├── src/pages/        # Six application pages
│   ├── src/components/   # Analysis, charts, segment explorer and Home scene
│   ├── src/context/      # In-memory analysis state
│   ├── src/services/     # API client and contract integration
│   ├── src/styles/       # Approved visual identity and shared typography
│   └── src/test/         # Frontend regression tests
├── backend/             # FastAPI routes, validation and analysis service
├── segmentation/        # Independent Python RFM/ML engine
├── tests/               # Python and API security tests
├── tools/               # Optional full-workbook validation
├── docs/
│   └── screenshots/     # Current public application screenshots
├── Online Retail.xlsx   # Attributed public example, inherited in Git
├── pyproject.toml
└── requirements-backend.txt
```


## Local setup

Use **Python 3.12** and **Node.js 24+** for the validated setup (the Python package declares support for 3.11+). The following commands use Windows PowerShell. On macOS/Linux, replace `.venv\Scripts\python.exe` with `.venv/bin/python` and use your shell's environment-variable syntax.

### 1. Clone and install the backend

```powershell
git clone https://github.com/JayantBansal900/customer-segmentation.git
Set-Location customer-segmentation
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-backend.txt
.\.venv\Scripts\python.exe -m pip install -e ".[backend,test]"
```

`requirements-backend.txt` records the validated runtime versions. The editable installation adds the local packages and test dependencies. Validate installation on your own operating system; numerical libraries may require different wheels.

### 2. Start FastAPI

Run from the repository root:

```powershell
$env:OMP_NUM_THREADS = "1"
$env:OPENBLAS_NUM_THREADS = "1"
$env:MKL_NUM_THREADS = "1"
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Health: `http://127.0.0.1:8000/api/health`. The backend reads process environment variables, **not** dotenv files automatically. Defaults support local development; [backend/.env.example](backend/.env.example) documents optional upload, concurrency and CORS settings. Keep the example workbook at the repository root for example analysis.

### 3. Start the frontend in another terminal

```powershell
Set-Location customer-segmentation\frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:5173**. If this terminal is already at the repository root, use `Set-Location frontend` instead. Vite loads `.env.local`; the example uses an empty browser API base and a development proxy to port 8000. `VITE_*` values are public browser configuration and must never contain secrets.

## Usage and input

1. Open **Analyze** and choose the example or upload one CSV/XLSX file.
2. Choose preprocessing, selected K and the candidate K range.
3. Run segmentation and wait for the actual result.
4. Explore **Segments** and **Insights**, then export the records or profiles you need.

| Required column | Expected content |
| --- | --- |
| `CustomerID` | Customer identifier; keep leading zeros as text. Blank IDs are excluded during cleaning. |
| `InvoiceNo` | Purchase invoice identifier. |
| `InvoiceDate` | ISO date/time or a typed Excel date; supply an explicit format for non-ISO CSV dates. |
| `Quantity` | Finite numeric quantity. |
| `UnitPrice` | Finite numeric unit price. |

CSV must use UTF-8; XLSX reads the first worksheet. Other columns may be present. Invalid dates/numeric values, duplicate headers or missing required columns produce validation errors; transaction values are not imputed. The default upload limit is 64 MiB. K is bounded by usable customers and distinct feature vectors, and the API supports at most 10 candidate values per request.

Results stay in memory while navigating and reset on a full refresh. Changing analysis settings clears the previous result. Cancelling the browser wait does not stop server computation.

## Dataset and attribution

The repository retains the original **Online Retail.xlsx**, a public dataset by **Chen, D. (2015)** from the [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/352/online+retail), DOI [10.24432/C5BW33](https://doi.org/10.24432/C5BW33). UCI licenses it under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The workbook is unmodified; Segmentra derives cleaned purchase profiles from it.

See [DATASET.md](#dataset-reference) for provenance, attribution and deployment provisioning. If the workbook is missing from your checkout, download the official dataset and place the extracted workbook at the repository root. Private uploads and exports belong outside Git and static hosting.

Dataset licensing is separate from Segmentra source code. No source-code license has been selected; this README does not grant an open-source license. Sora's license and font source are retained in [frontend/public/fonts](frontend/public/fonts).

## Frontend configuration

The React frontend uses Vite environment variables. Copy
`frontend/.env.example` to `frontend/.env.local` for local development.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API origin. Leave empty for same-origin requests or local proxy routing. |
| `API_PROXY_TARGET` | Development proxy target; defaults to `http://127.0.0.1:8000`. |
| `VITE_MAX_UPLOAD_BYTES` | Preliminary browser upload limit; defaults to 67,108,864 bytes (64 MiB). |
| `VITE_ANALYSIS_TIMEOUT_MS` | Browser analysis wait limit; defaults to 300,000 ms. |

Frontend verification:

```powershell
cd frontend
npm run typecheck
npm test
npm run build
```

For live integration testing, start both servers and run `npm run verify:http`.

When the backend API contract changes, run `npm run sync:contract` against the running backend, review the generated changes, and rerun tests. Preserve the OpenAPI snapshot, generated TypeScript declarations, and test fixtures.

Browser timeouts do not cancel backend computation. Never place secrets in `VITE_*` variables.

## Testing

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest
# Focused XLSX/CORS security regressions
.\.venv\Scripts\python.exe -m pytest tests/test_release_security.py
```

From `frontend`:

```powershell
npm test
npm run typecheck
npm run build
# Focused spreadsheet-safe export regressions
npm test -- src/test/csv-security.test.ts
```

Historical test results are not a substitute for rerunning the checks before deployment. The tests cover RFM semantics, cleaning, clustering, API validation, upload cleanup, prohibited XML, CORS, CSV security, frontend state, navigation and scene lifecycle behavior.

## Security and limitations

- XLSX uploads use active XML protection, archive checks and size budgets. CSV exports visibly prefix formula-like text with `[text] `; raw API/explorer identifiers stay unchanged. Import ordinary leading-zero IDs as text. See [export policy](#security-reference).
- Data quality, outliers and preprocessing affect clusters. Silhouette measures separation, not business usefulness; scores across different preprocessing spaces are not directly comparable.
- Large workbooks require significant CPU time and memory. Upload/ZIP budgets are not complete memory or computation-time bounds. One analysis is admitted per process by default.
- Personas describe retained purchases. No authentication, database, saved server-side analyses or background job queue is implemented.

## Deployment status

**Deployment is pending; no public application URL is available.** Local production builds have been verified. A chosen host still needs installation, resource-capacity, HTTPS, exact-origin CORS, request admission/rate limits, private temporary storage and SPA/API routing checks. Vite preview is a local validation server.

Review the [deployment reference](#deployment-reference) before hosting. Public CORS configuration alone does not prevent abuse of unauthenticated computation.

## Author and repository

Maintained in [JayantBansal900/customer-segmentation](https://github.com/JayantBansal900/customer-segmentation) by [JayantBansal900](https://github.com/JayantBansal900). Repository history and original project files are preserved.



---

## Architecture reference

### Architecture overview

The application is a React/TypeScript SPA, a FastAPI HTTP adapter and an independent Python segmentation package. There is no database, account system, queue or persisted analysis service.

`React configuration → multipart POST /api/analyze → FastAPI admission/validation → segmentation.run_pipeline → validated JSON → React context → segment explorer/charts/CSV`

| Responsibility | Actual source |
| --- | --- |
| Routes and shared navigation | `frontend/src/app`; six pages under `frontend/src/pages` |
| Analysis state and request lifecycle | `frontend/src/context`; configuration/file/result/status held in memory |
| Typed API client and contract checks | `frontend/src/services`, OpenAPI snapshot and generated declarations in `frontend/src/types` |
| Home illustration and charts | Custom WebGL with SVG fallback; Canvas PCA, SVG candidate chart, HTML bars/distributions |
| HTTP application and validation | `backend/main.py`, routes, schemas, middleware, configuration and analysis service |
| Numerical pipeline | `segmentation/`; [ML pipeline](#machine-learning-reference) |
| Regression tests | `tests/` and `frontend/src/test`, plus colocated Home tests |

Analysis starts on submission, never automatically on route mount. Dataset/model changes invalidate old results. Navigation preserves the context result; refresh clears it. Request-generation guards prevent stale completion, and controls prevent duplicate submission. Browser timeout/cancel stops waiting, not server computation. The explorer paginates 25 displayed rows; the full API response remains in browser memory.

FastAPI admits one analysis per process by default, including multipart parsing. Validation, ML and response serialization run in a worker thread; health remains asynchronous. Extra requests receive 503 rather than a queue. Multiple ASGI workers multiply memory and capacity. [API](#api-reference), [security](#security-reference) and [deployment](#deployment-reference) own those detailed contracts.

Vite's development/preview proxy is local tooling. Production requires a real static server and API routing with SPA fallback. Entry points remain `frontend/src/main.tsx` and `backend.main:app`.

## Machine learning reference

### Pipeline details

The authoritative implementation is `segmentation/`; the frontend renders returned values and does not train models.

1. **Ingest:** require case-sensitive `CustomerID`, `InvoiceNo`, `InvoiceDate`, `Quantity`, `UnitPrice`. UTF-8 CSV accepts an optional BOM; XLSX reads the first worksheet. Preserve textual IDs and extra columns. Reject duplicate headers, ragged CSV, missing invoice IDs, invalid/nonfinite numbers and invalid/ambiguous dates. Non-ISO strings need an explicit date format; typed Excel dates are accepted. Timestamps are normalized with an explicit UTC policy, rather than the host's timezone. No imputation or synthetic fallback occurs.
2. **Clean sequentially:** remove missing customer IDs, uppercase-C cancellation invoices, nonpositive quantities, nonpositive prices, then exact normalized source-row duplicates across all source columns. Counts are non-overlapping. Add positive `TotalAmount = Quantity × UnitPrice`; reject overflow or no retained purchases.
3. **Aggregate RFM:** reference timestamp = latest retained purchase + one day; Recency = whole elapsed days from each customer's latest purchase to that reference; Frequency = distinct purchase invoices; Monetary = retained positive purchase-value sum. Returns are excluded, so Monetary is not net revenue. The current calendar date is not the reference.
4. **Prepare features:** API `raw_standard` maps to engine `baseline` (`StandardScaler` on raw RFM). `log1p_standard` maps to `log1p` (`log1p` then `StandardScaler`). Fit one representation per run and reuse it. Raw RFM remains available in reports; no outlier clipping is implemented.
5. **Fit KMeans:** all three transformed RFM features, `k-means++`, seed 42, `n_init=10`. K must fit usable customers and distinct vectors. Selected K is independent of the candidate interval and recommendation; fitted candidates are reused where possible.
6. **Evaluate:** inertia plus valid silhouette. Use all customers up to 1,000, otherwise the same seeded uniform subset without replacement for every candidate. Invalid candidates carry a reason; undefined silhouette is unavailable, not zero. Highest valid silhouette recommends K, with smaller K breaking ties. No valid score means no recommendation; this is not an automatic elbow optimizer.
7. **Project and describe:** two-component full-SVD PCA on the same transformed matrix is for display only, never KMeans input. Degenerate PCA has an explicit unavailable reason. Profiles reconcile counts, purchase value/shares and raw mean/median RFM. Personas compare segment medians with population medians; they do not infer churn, predict revenue or produce marketing actions.

Silhouette across different representations uses different distance geometry. Sampling can miss rare clusters; data quality/outliers materially affect fits. Cluster IDs are arbitrary across analyses. Stability, causality and commercial usefulness require separate assessment. JSON uses null for unavailable display metrics, never NaN/Infinity.

See [API](#api-reference) for schema, K/range policy and response units, [dataset notice](#dataset-reference) for the bundled example, and [README](#testing) for test commands.


---

## API reference

### API overview

The FastAPI service is a thin adapter around the unchanged `segmentation` package. The engine owns ingestion, cleaning, purchase-only RFM, preprocessing, KMeans, candidate evaluation, PCA, profiles, and personas. The API owns multipart validation, resource limits, HTTP errors, admission control, and typed JSON serialization.

### Running and inspecting the service

Use the [root setup guide](#local-setup) for installation and startup. The service entry point is `backend.main:app`; `/docs`, `/redoc` and `/openapi.json` expose the actual schema. The example workbook is resolved from the repository root, not the caller's working directory. It is not bundled in a Python wheel.

### Endpoints and request contract

`GET /api/health` returns HTTP 200 with `{"status":"ok","service":"segmentiq","api_version":"1"}`. This indicates HTTP service availability.

`POST /api/analyze` accepts `multipart/form-data`. Put parameters in form text fields, never query parameters. Each field may appear once. Unknown fields are rejected. Choose exactly one source: upload `file`, or set `use_example=true` and omit `file`. There is no automatic example fallback and no filesystem-path request field.

| Field | Type and policy |
| --- | --- |
| `file` | One CSV or XLSX file; required unless `use_example=true`. Extension is case insensitive. Contents must parse as the stated format; MIME type alone is not trusted. Filename is reduced to its basename for display only. |
| `use_example` | Boolean; defaults to false. Set `true` explicitly to analyze the bundled Online Retail workbook. |
| `selected_k` | Required integer, 2–50 inclusive. Engine additionally requires K to fit the retained customer count and distinct feature vectors. Never replaced by recommended K. |
| `candidate_k_min` | Required integer, 2–50; inclusive lower bound. |
| `candidate_k_max` | Required integer, 2–50; inclusive upper bound, at least the lower bound. At most 10 consecutive candidate values. |
| `preprocessing` | `raw_standard` (default) or `log1p_standard`. These map to engine `baseline` and `log1p` respectively. |
| `date_format` | Optional string, at most 100 characters; explicit strptime format for non-ISO CSV dates, for example `%d/%m/%Y`. Omit for ISO strings or typed Excel dates. |

Selected K may lie outside the candidate interval. Individual candidates that do not satisfy mathematical constraints remain in the result with status/reason; they do not force the selected K to change. The API's K/range ceilings are resource policy, not changes to the ML engine.

CSV requires UTF-8 (optional BOM), a header, comma separators, and equally sized records. XLSX uses the first sheet and its first row as the header. Required case-sensitive columns are `CustomerID`, `InvoiceNo`, `InvoiceDate`, `Quantity`, and `UnitPrice`; extra source columns are retained for the engine's duplicate policy. Text identifiers retain leading zeros. Display formatting on numeric Excel cells cannot recover zeros missing from the stored value. Missing CustomerID is removed by cleaning; missing invoice IDs, invalid/ambiguous dates, and nonfinite/nonnumeric quantities or prices fail semantic validation. Quantities need not be whole numbers. See [ML pipeline](#machine-learning-reference) for cleaning and timestamp policies.

Example upload:

```powershell
curl.exe http://127.0.0.1:8000/api/analyze -F 'file=@sample.csv' -F 'selected_k=4' -F 'candidate_k_min=2' -F 'candidate_k_max=6' -F 'preprocessing=raw_standard'
```

Example built-in request:

```powershell
curl.exe http://127.0.0.1:8000/api/analyze -F 'use_example=true' -F 'selected_k=4' -F 'candidate_k_min=2' -F 'candidate_k_max=6' -F 'preprocessing=raw_standard'
```

The browser should construct `FormData` and let `fetch` set the multipart boundary; do not manually set its Content-Type header. Example-only requests must still use multipart form data.

### Exact successful response structure

HTTP 200 uses JSON with five sections: `metadata`, `cleaning`, `model_quality`, `customers`, and `segments`. Field names are snake_case. Nonfinite values are never emitted as JSON NaN/Infinity. Nullable display metrics use JSON null. All customer identifiers are strings.

`metadata`:

| Field | Meaning/type |
| --- | --- |
| `api_version`, `request_id` | String `"1"`; generated request correlation string. |
| `dataset_source`, `dataset_name` | `upload` or `example`; sanitized display filename. |
| `input_rows`, `cleaned_rows`, `customer_count` | Integer counts from the engine. |
| `reference_timestamp` | ISO timestamp from the engine, latest retained purchase timestamp plus one day. |
| `preprocessing`, `engine_preprocessing` | Public mode and its engine identifier. |
| `selected_k`, `recommended_k` | Chosen integer K and recommendation integer or null. |
| `total_monetary` | Sum of retained positive-purchase revenue, a finite number. |
| `purchase_policy`, `timestamp_policy` | Engine policy descriptions. |
| `package_versions` | Object mapping engine dependency names to version strings. |
| `pipeline_elapsed_seconds` | Engine-reported pipeline time. |
| `analysis_elapsed_seconds` | Service time through engine completion; excludes multipart parsing, response mapping/serialization, and network transfer. Measure end-to-end latency separately. |

`cleaning` contains integer fields `input_rows`, `missing_customer_ids`, `cancellation_lines`, `nonpositive_quantities`, `nonpositive_prices`, `exact_duplicates`, `excluded_rows`, `cleaned_rows`, `retained_customers`. Exclusions are sequential and non-overlapping in that order; cancellation invoice IDs begin with uppercase C. Exact duplicates use all original source columns. `excluded_rows = input_rows - cleaned_rows`.

`model_quality`:

- `selected`: chosen model's candidate-quality object.
- `candidates`: array of candidate-quality objects in the requested inclusive interval.
- Each candidate-quality object has `k` (integer), `inertia` (number/null), `silhouette` (number/null), `silhouette_sample_size` (integer), `status` (`ok`, `unavailable`, or `invalid`), and `reason` (string/null).
- `recommendation_explanation`: engine explanation string. The recommendation follows available sampled silhouette scores, not an invented elbow optimizer.
- `silhouette_sampling`: object with `strategy` (string), `seed` (integer), and `maximum_customers` (integer). The engine uses a deterministic uniform sample without replacement, the same subset for every K, capped at 1,000 customers. Small clusters may be absent from that sample.
- `pca`: object with `pc1_explained_variance_ratio`, `pc2_explained_variance_ratio` (numbers/null), and `reason` (string/null). Ratios use 0–1, not percentage points. PCA is a display projection of the selected representation.

`customers` is an array; every object contains:

| Field | Type |
| --- | --- |
| `customer_id` | String |
| `recency`, `frequency`, `cluster_id` | Integers; recency is elapsed days and frequency counts distinct purchase invoices. Cluster IDs are zero based. |
| `monetary` | Finite number; raw purchase revenue, never scaled/logged units. |
| `pc1`, `pc2` | Numbers or null |
| `persona`, `persona_description` | Strings or null |

`segments` is an array; every object contains `cluster_id` (integer), `customer_count` (integer), `customer_percentage` (number), `monetary` (raw segment purchase revenue), `monetary_contribution_percentage` (number), `mean_rfm`, `median_rfm`, `persona`, `persona_description`, and `recommendations`. Each RFM object has finite numeric `recency`, `frequency`, and `monetary`. Personas/descriptions are descriptive strings or null; `recommendations` is currently always null because the engine supplies no marketing-action recommendations. Both percentage fields are in percentage points, 0–100; sums are approximately 100, allowing floating-point rounding. IDs/personas have no cross-analysis stability guarantee.

When K equals the usable customer count, a legitimate fitted model can have unavailable silhouette. PCA can also be unavailable for degenerate inputs. Render these as unavailable, not zero. Recommendations can be null if no candidate has a valid silhouette score.

### Error contract

API failures return `{"error":{"code":"...","message":"...","stage":"...","issues":[],"context":{},"request_id":"..."}}`. Each issue has `code`, `message`, `column` (string/null), `rows` (integer array), and `location` (array of strings/integers). Dataset row references include the header: first data row is row 2. Configuration locations begin with `body`. Engine-provided context can include sequential cleaning counts. `X-Request-ID` is also present on API responses. Tracebacks and raw customer records are not logged by this adapter; internal logs contain exception type, function name, and correlation ID only.

| HTTP status | Examples |
| --- | --- |
| 400 | Missing/conflicting source, unsupported extension/content type, corrupt workbook/CSV structure, duplicate multipart fields, unsupported query parameters. |
| 413 | File/request exceeds its configured budget; XLSX declared expansion or member-count budget exceeded. |
| 422 | Missing/invalid configuration, unsupported preprocessing, missing columns, invalid dates/numbers, no eligible rows, invalid selected K. |
| 500 | Unexpected analysis/serialization failure; generic safe response. |
| 503 | Analysis capacity busy or bundled example absent; `Retry-After: 1`. |

Parser errors use the same API envelope. Normal CORS preflight responses are produced by Starlette's CORS middleware, including its plain rejection of a disallowed preflight.

### Configuration and resource policy

Optional environment variables are read at application startup. Invalid settings fail startup.

| Environment variable | Default |
| --- | --- |
| `SEGMENTIQ_MAX_UPLOAD_BYTES` | 67,108,864 bytes (64 MiB); also applies to the built-in file. |
| `SEGMENTIQ_MULTIPART_OVERHEAD_BYTES` | 1,048,576 bytes (1 MiB). Whole request budget is file limit plus overhead. |
| `SEGMENTIQ_MAX_XLSX_EXPANDED_BYTES` | 536,870,912 bytes (512 MiB), based on ZIP metadata. At most 1,000 archive members; no extraction. |
| `SEGMENTIQ_MAX_CONCURRENT_ANALYSES` | 1 per application process, including multipart parsing. Excess requests fail fast; no queue. |
| `SEGMENTIQ_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173`; comma-separated explicit HTTPS origins (HTTP only on loopback), without paths, wildcards or credentials. Empty value disables cross-origin access. |

The original workbook is 23,715,344 bytes, with declared ZIP expansion 184,964,794 bytes, within these defaults. Entire request bytes are counted as they stream, even without Content-Length; individual file size is checked before ingestion. Multipart permits one file, eight text fields, and 16 KiB per text part. Starlette spools large uploaded files to its temporary-file storage, closes completed uploads on all route exits, and closes partial parser files on budget failure. The built-in file is opened read-only and resolved from the repository, independent of working directory.

File-size/ZIP checks are admission safeguards, not a strict process-memory or CPU-time sandbox. The existing engine materializes transaction DataFrames, scans CSV structure before parsing, and may normalize an already loaded frame in its public pipeline. The adapter calls ingestion once and the public pipeline once; it does not duplicate analytics. Response validation and serialization occur in the same worker thread. The event loop remains available for health requests.

### Tests and service limitations


This is a synchronous local service: the HTTP request waits for analysis. There is no persisted result, pagination, progress endpoint, background job, hard execution timeout, or cancellation API. A client timeout does not guarantee worker cancellation. Every accepted request computes anew. One-process admission control is not a distributed limit. The response includes all retained customers, so large datasets consume memory during mapping/serialization and increase download size. CSV/XLSX safeguards and explicit CORS configuration are implemented; authentication, a database, and production deployment are not. See [security](#security-reference) and [deployment](#deployment-reference). Alternate supported dependency versions, multi-process capacity, actual hosting ingress and sustained load remain unverified. Browser workflow milestones are recorded in development history; they are separate from API unit tests.

### Upload security

See [deployment requirements](#deployment-reference) for production origin/routing/startup requirements and [dataset notice](#dataset-reference) for example attribution. XLSX parsing requires active `defusedxml==0.7.1`; startup fails closed without it. Prohibited XML entities/external references return HTTP 400 `invalid_workbook`, stage `ingestion`, using the existing error envelope and a generic safe message. Other ingestion validation errors retain their documented codes/statuses. Archive duplicate names are rejected; file, request, member and expanded-size budgets remain unchanged.


---

## Security reference

### Security safeguards

Customer exports (filtered Segments and all-customer Insights) and segment profile exports share `frontend/src/utils/csv.ts`. Formula-like **string** values get a visible `[text] ` prefix before standard CSV quoting/quote doubling. Detection checks `= + - @` after a detection-only NFKC normalization and removal of leading Unicode whitespace, control/format characters and quotes. The original string is retained after the marker. Numeric API values, including negative PCA coordinates, are unchanged.

Quoting alone does not prevent spreadsheet formula interpretation. The visible ASCII marker puts `[` at the decoded cell start and survives ordinary trimming and CSV parse/reserialization without relying on application-specific apostrophe/tab behavior. This changes the downloadable representation of risky IDs and other text. JSON and the customer explorer retain authoritative identifiers; never blindly remove markers from arbitrary data. Leading-zero IDs still require importing the column as text.

Tests decode real CSV with PapaParse, check field boundaries and the effective cell start, and serialize/reparse the decoded cells. They cover 19 threat inputs, every exported customer text field, profile text, and unchanged negative numeric coordinates. Native Excel/LibreOffice automation was not performed. CSV cannot guarantee fidelity and safety across every spreadsheet import/transformation; explicitly converting a protected cell back to a formula defeats this policy. Use API JSON for exact machine-readable identifiers.

Policy reference: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).

### XLSX and HTTP ingestion

`backend/services/analysis_service.py` verifies active openpyxl/defusedxml parsing and fails closed if protection is inactive. The declared dependency is `defusedxml==0.7.1`. Prohibited entity declarations/external references return HTTP 400 `invalid_workbook`, stage `ingestion`, in the existing safe error envelope. Classification walks explicit exception causes and checks actual `DefusedXmlException` types; unrelated validation errors retain their own handling.

File/content checks, encrypted/duplicate ZIP member rejection, declared expanded-size/member budgets, bounded streaming multipart requests and upload-handle cleanup remain enabled. Admission capacity is released after success or failure. See [API limits and error contract](#api-reference) for exact budgets/statuses. Budget checks do not bound all object memory or computation time.

API requests accept an upload or the bundled example, never an arbitrary client filesystem path. Unexpected failures return safe messages; adapter logs contain correlation ID/type/function rather than raw customer records or stack traces. Explicit CORS allows configured HTTPS origins and loopback HTTP, without wildcard credentials. CORS is not authentication or abuse prevention. There are no accounts or authentication controls; public compute needs the [hosting safeguards](#deployment-reference).

### Verification and privacy

`tests/test_release_security.py` covers prohibited XML across workbook parts, fail-closed activation, duplicate archives, safe errors, valid-upload recovery, cleanup and CORS. `frontend/src/test/csv-security.test.ts` covers spreadsheet-safe exports. Run commands are in the [README](#testing); completed runs are historical evidence unless explicitly rerun.

Keep uploads, exports, dotenv values and local review archives out of Git and static hosting. Browser results are memory-only; refresh clears them. Temporary upload spooling is not persistent result storage. Public UCI attribution and privacy considerations are documented in the [dataset notice](#dataset-reference).


---

## Dataset reference

### Dataset provenance

Source: [UCI Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail). Citation: Chen, D. (2015). Online Retail. UCI Machine Learning Repository. https://doi.org/10.24432/C5BW33. UCI licenses the dataset under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Retain attribution, a license link, and describe modifications when redistributing. Segmentra analysis derives cleaned purchase-only RFM profiles; the bundled workbook itself is unmodified. This notice does not choose a license for Segmentra source code.

The local workbook was compared against the workbook extracted from UCI's official download. Both contain 23,715,344 bytes with SHA-256 `43465a06f2ccf7c8b5bd2892bc7defb52f97487934fe93b16ae4c3936424676d`; they are byte-identical. Redistribution provenance is verified, rather than inferred from a filename.

Customer numbers are pseudonymous identifiers, not proof of anonymity. Transactions can still reveal purchasing behavior. Do not put private replacement datasets, uploaded files, exports, or customer screenshots into Git. The original workbook is already in inherited Git history and was retained in the Phase 5D publication; this cleanup neither changes nor republishes it. Preserve the original project/history.

For hosting, provision the example workbook read-only at the repository-root `Online Retail.xlsx` expected by the server, outside frontend/static serving. Prefer a separately downloaded, hash-verified deployment asset rather than repeatedly embedding it in images. If absent, the existing example request returns 503 `example_unavailable`; CSV/XLSX uploads remain available. Include this attribution in any public example deployment/distribution and review public display of the historical transactional data before publication. Dataset license permission is not a privacy guarantee.


---

## Deployment reference

### Deployment checklist

No provider has been selected and no deployment performed. Use Python 3.12 and Node 24 for the currently validated environment. Install the backend with `python -m pip install -r requirements-backend.txt` from the repository root; install frontend dependencies with `npm ci`, then `npm run build` in `frontend`. The pinned backend snapshot records the tested versions; validate a fresh installation on the chosen OS before release. `pyproject.toml` retains the supported ranges and optional test/backend groups.

### Origins and startup

Copy the example files only to local ignored `.env` files. Vite loads its environment files; the backend does **not** automatically load dotenv files, so export backend values through the shell/host settings. All `VITE_*` values are public. Never store secrets in them.

- Same-origin production: leave `VITE_API_BASE_URL` empty and set `SEGMENTIQ_CORS_ORIGINS` to an empty string. Reverse-proxy `/api/*` to FastAPI.
- Separate HTTPS hosts: build with `VITE_API_BASE_URL=https://api.example.com` and configure `SEGMENTIQ_CORS_ORIGINS=https://app.example.com` using the actual explicit frontend origin. CORS denies other browser origins; it is not authentication or an abuse prevention control.
- `API_PROXY_TARGET=http://127.0.0.1:8000` is a development/preview proxy setting, not a production browser origin. Local default CORS allows only localhost/127.0.0.1 port 5173. HTTP is accepted only on loopback; public origins require HTTPS, with no paths, credentials or wildcards.

From repository root, launch local development using `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1`. For a container/private service interface use `--host 0.0.0.0 --port <host-assigned-port> --workers 1` behind HTTPS ingress. Host/port are explicit Uvicorn arguments; do not assume backend dotenv contains them. Configure `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `MKL_NUM_THREADS=1` **before** launching Python. Health: `curl --fail http://127.0.0.1:8000/api/health`. Server startup fails closed if openpyxl XML protection is inactive; restart after dependency installation.

Serve only `frontend/dist` as static content. Configure history fallback to `index.html` for `/analyze`, `/segments`, `/insights`, `/methodology`, `/about` and other client routes. Exclude `/api/*` and missing static assets from that fallback. Vite preview validates the built app locally but is not a production server.

### Request and resource policy

Backend defaults: 64 MiB file; 65 MiB entire multipart request; one file/eight fields; 16 KiB text fields; XLSX 1,000 archive members/512 MiB declared expanded content; one admitted analysis per process. Duplicate/encrypted archives and prohibited XML entities are rejected. These limits do not bound total Python object memory or computation time. Preserve the browser preliminary limit (`VITE_MAX_UPLOAD_BYTES=67108864`) and align any tighter ingress limit with user feedback.

The browser waits up to `VITE_ANALYSIS_TIMEOUT_MS=300000`; the development proxy adds 30 seconds. This is **not** server computation cancellation. Set the chosen ingress timeout to accommodate measured requests, and test slow uploads/disconnections. Do not add a misleading thread deadline: abandoned CPU work can continue. Configure bounded upload read time, connection/request rates, request body limits, private temporary storage and disk quotas at the selected ingress/host. Public unauthenticated compute needs abuse controls before exposure.

Historical Phase 5A example: approximately 88.28 s, 482 MiB sampled resident memory and 1.71 MB response. Treat these as measurements of one run, not bounds. A 512 MiB host has inadequate headroom. Start capacity evaluation with at least 1 GiB and preferably 2 GiB per worker, then load-test the selected host and maximum permitted inputs. One worker preserves global per-process admission; multiple workers multiply memory and analysis capacity. Keep `SEGMENTIQ_MAX_CONCURRENT_ANALYSES=1` until measured otherwise. Health is asynchronous while analysis runs in a thread; excess analysis requests return 503 `analysis_busy` and Retry-After 1.

### Required gates before hosting

1. Review the intended deployment files and scan for secrets. Preserve dataset/font notices; exclude private uploads, exports and local archives. Source-code licensing remains an owner decision; it is separate from the verified dataset license.
2. Reproduce installation, tests and build on the target OS; review current runtime advisories and installer advisories separately.
3. Select a host with demonstrated memory/CPU/temporary-disk headroom; configure HTTPS, exact origins, SPA/API routing and ingestion/abuse limits.
4. Stage-test example, upload limits, invalid XML, busy responses, health responsiveness, disconnect behavior and deep-link refresh through the actual ingress.
5. Decide whether to provision the public UCI example and retain attribution. Never serve raw uploads/workbooks as static assets.
6. Obtain separate deployment authorization after the hosting checks pass. The Phase 5D GitHub publication is historical; this cleanup performs no commit, push or deployment.
