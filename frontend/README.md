> Current product: **Segmentra**. All six premium pages are implemented in this production frontend. The following Phase 2B notes describe its preserved functional foundation; historical styling descriptions below are superseded by the current source.
>
> Deployment configuration (Phase 5A): `VITE_API_BASE_URL` is an optional HTTP(S) **origin**, e.g. `https://api.example.com`, embedded at build time. Leave it empty for same-origin `/api` routing. Never put secrets in `VITE_*` values. Vite dev/preview proxy settings do not become a production proxy. The backend accepts explicitly configured HTTPS origins and loopback HTTP development origins. Configure only the actual frontend origin for separate hosting; same-origin proxy routing needs no remote CORS allowlist. See `../PHASE5A_AUDIT_REPORT.md` for measured limits and remaining release blockers. No deployment has been performed.

# SegmentIQ functional frontend — Phase 2B

React + TypeScript + Vite + React Router + Tailwind CSS. This application consumes the existing FastAPI API; it does not calculate RFM, KMeans, personas, or model recommendations. The current design is deliberately functional. The dimensional visual transformation belongs to Phase 3.

## Requirements and startup

Use Node **24+**; validation used bundled Node 24.19.0 and npm 10.8.2. The machine's system Node 20.17.0 is too old for the selected tools. Dependencies are pinned in `package.json` and `package-lock.json`.

Start the backend from the repository root in a separate terminal, using the dedicated environment described in `../BACKEND_API.md`:

```powershell
Set-Location 'E:\All Project\customer segmentation'
$env:OMP_NUM_THREADS='1'
$env:OPENBLAS_NUM_THREADS='1'
$env:MKL_NUM_THREADS='1'
& .\.backend-env\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Create `.backend-env` and install `.[backend,test]` first if that dedicated environment does not exist. Do not use the original project's venv. This session instead validated with the existing isolated interpreter at `C:\Users\ASUS\OneDrive\Documents\ChatGPT\Customer segmentation\.phase1-env\Scripts\python.exe`; it can replace the interpreter path above on this machine.

With Node 24+ installed, start the frontend:

```powershell
Set-Location 'E:\All Project\customer segmentation\frontend'
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The dev server uses a strict port and proxies relative `/api` requests to the existing backend at `http://127.0.0.1:8000`. No production endpoint is hardcoded into browser code. Vite's development SPA fallback supports direct routes. Production static hosting would need an equivalent route fallback and API routing; no deployment is included here.

For this machine's bundled runtime, use this exact alternative to npm commands:

```powershell
$segmentiqNode = 'C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$segmentiqNpm = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'
$env:PATH = (Split-Path $segmentiqNode) + ';' + $env:PATH
& $segmentiqNode $segmentiqNpm run dev
```

## Routes and architecture

Routes: `/` Home; `/analyze` guided analysis; `/segments` profiles/customer explorer; `/insights` quality/charts/cleaning; `/methodology` implemented pipeline; `/about` personal project; unknown paths render a useful 404 state. Router links update URLs without a full page reload. Navigation has active-state semantics; route changes focus the main landmark and update the title.

`src/app` owns routes/layout. `pages` compose views. `components/analysis`, `components/segments`, `components/charts`, and `components/ui` contain reusable presentation. `context/AnalysisContext.tsx` owns dataset/configuration/result/request state. `services/api.ts` is the single HTTP client. `types/schema.d.ts` is generated from the actual FastAPI OpenAPI snapshot; `types/analysis.ts` supplies application aliases and configuration types. The runtime contract checker reads the same schema to reject malformed/nonfinite/wrongly typed responses. Utilities handle formatting, display-only histogram bins, table filtering/sorting, and CSV serialization.

## Guided workflow and shared state

Choose the bundled Online Retail example or CSV/XLSX upload. Selecting a file explicitly switches to upload mode; the example cannot silently override it. The browser shows filename/type/size. CSV preview reads only the first 64 KiB, up to five records and eight columns, using Papa Parse with string values and quoted-field support. The required-column checklist is preliminary; the server validates the full file, dates, numerics, cleaning, and customer/K constraints. XLSX records are not expanded in the browser; validation and loading occur on the backend.

Controls map exactly to multipart fields: `file` **or** `use_example=true`, `selected_k`, `candidate_k_min`, `candidate_k_max`, `preprocessing`, optional `date_format`. Selected K defaults to 4, candidate range 2–6, and preprocessing to `raw_standard`; `log1p_standard` is selectable. K/range limits mirror the API's 2–50 and at-most-10-candidates policy. Selected K need not be in the candidate range. Non-ISO CSV dates may use an explicit date format.

Analysis starts only from form submission, never an effect. A synchronous ref guard plus disabled controls prevent duplicate submissions. A request generation token ignores obsolete completions. Data/model changes clear results immediately; route navigation retains configuration, selected file, and results without recalculation. State is in memory: reloads lose it, and no customer data is stored in localStorage or a database.

The loading message is honest: uploading/analyzing, with elapsed waiting time and no invented pipeline stages or percentages. The request timeout defaults to five minutes; proxy timeouts are 30 seconds longer. **Stop waiting** aborts the browser request only. The existing backend has no computation-cancellation endpoint and may continue occupying its analysis slot; wait before retrying. There is no automatic retry or background-job API.

## API/error handling and configuration

The client handles structured HTTP errors, network failures, malformed/non-JSON responses, contract mismatch, cancellation, and timeout. Backend issue columns, rows, locations, stage, and request ID are displayed when supplied. No request-body data is logged by the frontend. Health is checked on layout mount; a failed check offers an explicit retry. This is a last-check availability indicator, not a continuous monitor.

Optional local environment values (copy `.env.example` to `.env.local` and restart Vite):

| Variable | Default and purpose |
| --- | --- |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000`, server-side Vite proxy target. |
| `VITE_MAX_UPLOAD_BYTES` | `67108864`, preliminary client file budget. Keep aligned with the backend's configured limit. |
| `VITE_ANALYSIS_TIMEOUT_MS` | `300000`, browser analysis wait budget; dev/preview proxies use this plus 30,000 ms. |

No browser-side API host variable is needed: all requests use relative `/api` paths. Resource settings must be positive integers.

## Results, charts, and exports

Segments show actual customer counts/shares, purchase totals/contribution, raw mean/median RFM, and returned personas. Interactive cluster selection provides a profile detail view. Null recommendations do not produce invented marketing actions or churn claims.

The customer explorer searches string IDs, filters clusters, sorts numeric or ID columns, and renders **25 rows per page**. Filtering/sorting is memoized over the returned data. Export filtered customers includes all matching records, not just the current page. Insights also exports all customers; segment export includes all returned profiles.

Charts are lightweight DOM bars plus a 2D canvas, avoiding a charting/3D dependency. Bar charts have readable labels and numeric values. Raw RFM distributions use up to ten equal-width display bins. The PCA canvas draws returned coordinates without creating thousands of DOM points; its accessible description, labeled legend, and exported coordinates provide alternatives. Colors repeat after six clusters. Model-quality and cleaning tables expose exact available fields and reasons. PCA is a projection, not a prediction or the clustering input.

Numbers use consistent neutral formatting; no currency is assumed. Dates display UTC. Null metrics/personas are explicitly unavailable. PCA variance ratios are converted to percentage points only for display. CSV exports retain raw numeric values, correct quoting/newline escaping, and textual identifiers. Import the customer-ID column as text in spreadsheet tools to preserve leading zeros. Exports contain only returned data; unsupported recommendations are omitted rather than invented.

## Checks and contract refresh

```powershell
npm run typecheck
npm test
npm run build
npm run verify:http
```

`verify:http` requires both local servers and performs actual requests through the Vite proxy, saving `http-validation.json`. It is separate from mocked tests. The tiny JSON fixture is an actual small backend response stored **only for tests**; it is never used as product/demo data. Canvas visuals are verified in the browser; jsdom tests cover accessible states and omit canvas drawing.

To refresh types after an intentional backend contract change, start FastAPI and run `npm run sync:contract`. This retrieves `/openapi.json` and regenerates declarations. Review the diff, runtime compatibility, and tests. It does not change the Python API. Alternate backend origin: `node scripts/sync-contract.mjs http://127.0.0.1:8001` followed by `npm run generate:types`.

`npm run preview` serves the built application locally at port 4173 and uses the same API proxy. This is local preview support; deployment is outside the phase scope.

## Validation and limits

See `../PHASE2B_VALIDATION.md` and the recorded HTTP/browser evidence. Unit/component tests use mocked APIs; they are not presented as proof of live connectivity. Actual browser testing includes the full original workbook, route navigation/history, charts, filtering/sorting, CSV upload, and downloads.

The entire JSON response remains in memory. Tables are paginated, but there is no server pagination, streaming result, persisted state, hard computation cancellation, or guaranteed latency. Large outliers can dominate histogram ranges/PCA scales. Heuristic personas and silhouette recommendations require interpretation. Formal assistive-technology/WCAG certification, mobile-device testing, cross-browser testing, sustained load, and deployment are NOT TESTED. No final dimensional styling, 3D, accounts, database, or distributed workers are included.

Current foundation: ivory `#F4F0E8`, charcoal `#171C1B`, coral `#E66B43`, sage `#73877D`, and white. Labels, focus styles, table captions/sort semantics, landmarks, skip link, disabled controls, and live status/error messages support accessible operation. Phase 3 can transform presentation while retaining these contracts and behaviors.
