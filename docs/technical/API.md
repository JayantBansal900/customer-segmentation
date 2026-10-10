# Segmentra API v1

The FastAPI service is a thin adapter around the unchanged `segmentation` package. The engine owns ingestion, cleaning, purchase-only RFM, preprocessing, KMeans, candidate evaluation, PCA, profiles, and personas. The API owns multipart validation, resource limits, HTTP errors, admission control, and typed JSON serialization.

## Running and inspecting the service

Use the [root setup guide](../../README.md#local-setup) for installation and startup. The service entry point is `backend.main:app`; `/docs`, `/redoc` and `/openapi.json` expose the actual schema. The example workbook is resolved from the repository root, not the caller's working directory. It is not bundled in a Python wheel.

## Endpoints and request contract

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

CSV requires UTF-8 (optional BOM), a header, comma separators, and equally sized records. XLSX uses the first sheet and its first row as the header. Required case-sensitive columns are `CustomerID`, `InvoiceNo`, `InvoiceDate`, `Quantity`, and `UnitPrice`; extra source columns are retained for the engine's duplicate policy. Text identifiers retain leading zeros. Display formatting on numeric Excel cells cannot recover zeros missing from the stored value. Missing CustomerID is removed by cleaning; missing invoice IDs, invalid/ambiguous dates, and nonfinite/nonnumeric quantities or prices fail semantic validation. Quantities need not be whole numbers. See [ML pipeline](ML_PIPELINE.md) for cleaning and timestamp policies.

Example upload:

```powershell
curl.exe http://127.0.0.1:8000/api/analyze -F 'file=@sample.csv' -F 'selected_k=4' -F 'candidate_k_min=2' -F 'candidate_k_max=6' -F 'preprocessing=raw_standard'
```

Example built-in request:

```powershell
curl.exe http://127.0.0.1:8000/api/analyze -F 'use_example=true' -F 'selected_k=4' -F 'candidate_k_min=2' -F 'candidate_k_max=6' -F 'preprocessing=raw_standard'
```

The browser should construct `FormData` and let `fetch` set the multipart boundary; do not manually set its Content-Type header. Example-only requests must still use multipart form data.

## Exact successful response structure

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

## Error contract

API failures return `{"error":{"code":"...","message":"...","stage":"...","issues":[],"context":{},"request_id":"..."}}`. Each issue has `code`, `message`, `column` (string/null), `rows` (integer array), and `location` (array of strings/integers). Dataset row references include the header: first data row is row 2. Configuration locations begin with `body`. Engine-provided context can include sequential cleaning counts. `X-Request-ID` is also present on API responses. Tracebacks and raw customer records are not logged by this adapter; internal logs contain exception type, function name, and correlation ID only.

| HTTP status | Examples |
| --- | --- |
| 400 | Missing/conflicting source, unsupported extension/content type, corrupt workbook/CSV structure, duplicate multipart fields, unsupported query parameters. |
| 413 | File/request exceeds its configured budget; XLSX declared expansion or member-count budget exceeded. |
| 422 | Missing/invalid configuration, unsupported preprocessing, missing columns, invalid dates/numbers, no eligible rows, invalid selected K. |
| 500 | Unexpected analysis/serialization failure; generic safe response. |
| 503 | Analysis capacity busy or bundled example absent; `Retry-After: 1`. |

Parser errors use the same API envelope. Normal CORS preflight responses are produced by Starlette's CORS middleware, including its plain rejection of a disallowed preflight.

## Configuration and resource policy

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

## Tests and service limitations

See the [root testing guide](../../README.md#testing). API and upload security cases are covered by `tests/test_backend_api.py` and `tests/test_release_security.py`. Historical measurements are summarized in [development history](../development-history/DEVELOPMENT_SUMMARY.md).

This is a synchronous local service: the HTTP request waits for analysis. There is no persisted result, pagination, progress endpoint, background job, hard execution timeout, or cancellation API. A client timeout does not guarantee worker cancellation. Every accepted request computes anew. One-process admission control is not a distributed limit. The response includes all retained customers, so large datasets consume memory during mapping/serialization and increase download size. CSV/XLSX safeguards and explicit CORS configuration are implemented; authentication, a database, and production deployment are not. See [security](SECURITY.md) and [deployment](DEPLOYMENT.md). Alternate supported dependency versions, multi-process capacity, actual hosting ingress and sustained load remain unverified. Browser workflow milestones are recorded in development history; they are separate from API unit tests.

## Upload security

See [deployment requirements](DEPLOYMENT.md) for production origin/routing/startup requirements and [dataset notice](DATASET.md) for example attribution. XLSX parsing requires active `defusedxml==0.7.1`; startup fails closed without it. Prohibited XML entities/external references return HTTP 400 `invalid_workbook`, stage `ingestion`, using the existing error envelope and a generic safe message. Other ingestion validation errors retain their documented codes/statuses. Archive duplicate names are rejected; file, request, member and expanded-size budgets remain unchanged.
