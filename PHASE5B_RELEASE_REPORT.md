# SEGMENTRA Phase 5B release report

**Status: READY WITH EXPLICIT CONDITIONS.** Application security and source-staging blockers are remediated. Public exposure still requires a selected/validated host, ingress resource/abuse controls and publication review. No deployment, GitHub push, history rewrite or source-code license invention occurred.

The Phase 5A report was read in full before edits. All previous development work was preserved in a 136-file local ZIP/hash checkpoint. This report covers both the interrupted Phase 5B work and its continuation.

## 1. Original blockers and disposition

| Original issue | Classification | Verified disposition |
| --- | --- | --- |
| Production source largely untracked | RESOLVED | Explicit reviewed 124-path staging allowlist covers frontend/backend/ML/tests/contracts/manifests/docs. Index now contains required application source; no push or new commit. |
| Formula-like text exported unchanged | RESOLVED | Shared CSV boundary prefixes risky strings with visible `[text] `; API/ML/explorer values unchanged. Decoded threat and actual-download evidence passes. |
| Recommended XLSX XML protection absent | RESOLVED | Compatible defusedxml 0.7.1 declared/installed, fail-closed activation check, prohibited entity rejection with safe errors, duplicate archive rejection and existing budgets/cleanup preserved. |
| Production API/CORS portability | RESOLVED | Existing configurable API origin retained; explicit public HTTPS CORS enabled with local development preserved. Safe templates and startup/SPA routing documentation provided. |
| Large-request hosting/resources/public abuse controls | PARTIALLY RESOLVED | Existing limits, threaded health and 503 behavior verified; host capacity and ingress controls await hosting selection. No fabricated CPU deadline or queue rewrite. |
| Dataset redistribution/attribution unclear | RESOLVED | Local workbook byte-identical to official UCI download; CC BY 4.0 verified, notice and provisioning/privacy recommendations added. No dataset publication. |
| Installer advisory findings | RESOLVED for isolated validation environment | pip 25.0.1 patched to reviewed official 26.2.1; fresh exact-version OSV query reports no matches. Application libraries unchanged apart from added XML protection. Original legacy venv untouched. |
| Public release license/host-specific validation | UNRESOLVED decisions | Source-code licensing/publication choice and target-host installation/ingress/capacity checks remain explicit pre-publication gates. |

## 2. Root cause of all eight failing security tests

Both harmless internal entity declarations and external entity declarations were tested in four actual workbook parts: worksheet, workbook, content types and styles. Each returned HTTP 400 but `analysis_validation_error` instead of the expected `invalid_workbook`. Inspecting every explicit exception chain confirmed:

`AnalysisValidationError -> openpyxl ValueError -> defusedxml.EntitiesForbidden`

The protection already rejected the XML. openpyxl wrapped the security exception, then existing ingestion wrapped that ValueError. The first implementation checked only the immediate cause and missed the underlying security exception. No assumption based on error-message text was used.

## 3. Exact fix and preserved behavior

In `backend/services/analysis_service.py`, the existing `AnalysisValidationError` catch now walks explicit `__cause__` links and classifies only an actual `DefusedXmlException`. It returns HTTP 400 `invalid_workbook`, stage `ingestion`, using the project's existing error envelope and the generic message: Workbook XML contains prohibited entities or external references. Other validation exceptions are re-raised with their existing handling. No broad new programming-error catch was added.

Tests were not weakened. All eight original assertions now pass, including non-disclosure of entity values/external paths, upload closure, recovery with a successful subsequent workbook and health responsiveness. The authoritative ingestion/ML modules and FastAPI routes/handlers/schema remain unchanged.

## 4. Files changed or created

Changed existing files:

- `.gitignore`: narrowly ignore local QA artifacts, checkpoints, backups and generated reports; required contracts/fixtures/env examples remain trackable.
- `backend/config.py`: validate explicit production HTTPS origins, retaining loopback HTTP and empty same-origin mode.
- `backend/services/analysis_service.py`: parser activation guard, duplicate archive rejection and narrow XML error classification.
- `backend/.env.example`: accurate production/local CORS instructions.
- `pyproject.toml`: add `defusedxml==0.7.1`; retain existing library ranges.
- `frontend/src/utils/csv.ts`: shared spreadsheet-safe output boundary.
- `frontend/src/components/segments/CustomerTable.tsx`: export-fidelity help text only.
- `frontend/README.md`: correct outdated local-only CORS note.
- `BACKEND_API.md`: correct origin rules and document XLSX security error convention.
- `README.md`: concise release-document links; historical content retained.

Created:

- `frontend/src/test/csv-security.test.ts`
- `tests/test_release_security.py`
- `requirements-backend.txt`
- `EXPORT_SECURITY.md`
- `DATASET_NOTICE.md`
- `DEPLOYMENT_READINESS.md`
- `STAGING_MANIFEST.md`
- `PHASE5B_RELEASE_REPORT.md`

Local-only evidence/scripts/checkpoint and isolated environment changes are outside the production source allowlist. No page redesign or content simplification occurred.

## 5. Git tracking and staging safety

Baseline: six files tracked; modern application largely untracked; no pre-existing staged changes. The inherited commit remains `58d6b6c` (Initial commit - Customer Segmentation project). The reviewed allowlist in STAGING_MANIFEST.md stages 124 paths: required existing production work plus this phase's fixes/docs. The index contains 129 tracked paths total, including the six inherited files. A full local checkpoint ZIP remains preserved. No new Git commit was made; staged changes are reviewable before a deliberate local commit.

Environment secrets, environments, node_modules, dist, caches, uploads, private replacement data, CSV exports, screenshots and generated reports are excluded. A scoped credential-pattern scan found no matches in the allowlist; this is not a promise that every possible credential type was scanned. Required source paths were checked against ignore rules. Historical validation/audit reports remain preserved locally and intentionally outside this release staging plan. `git diff --cached --check` reports pre-existing whitespace in the Sora license, DatasetUpload, AnalysisContext, analyze/futuristic styles and product-page tests. Their checkpoint hashes are unchanged; these warnings were preserved rather than performing unrelated formatting changes. The Phase 5B changed/new source and documentation paths pass the scoped whitespace check.

The public UCI workbook is unchanged in inherited history; it is not newly staged. The original project files/PNG/history are retained. A future push will include inherited history unless the user chooses a separate publication approach; no destructive cleanup or history rewrite was attempted.

## 6. CSV export security and evidence

All three download controls share the same utility: Segments filtered customers, Segments profiles, Insights all customers (including PCA coordinates). Formula-like **strings** receive `[text] ` before CSV quoting/double-quote escaping. Detection uses a normalized probe for `= + - @`, including leading Unicode whitespace/control/format/quote bypasses and fullwidth equivalents; the original text is retained following the marker. Trusted numeric values, including negative PCA coordinates, are not prefixed.

22 new tests cover 19 threat strings, decoded field structure/effective cell starts, decode-reserialize-decode stability, every exported customer text field, segment persona text, unchanged source objects and negative numeric values. Initial new-test run had two incorrect expected spellings (`-.67` versus JavaScript's `-0.67`); those test expectations were corrected, with no relaxation of protection. Final full suite passes.

Actual browser CSV analysis used six synthetic customer IDs including `=1+1`, `+SUM(1,2)`, `-1+2`, `@SUM(1,2)`, a BOM-prefixed trigger and `0001`. Both customer downloads were parsed with PapaParse. Five decoded IDs begin `[text] `; `0001` remains exact. Each exported R/F/M, cluster and PCA numeric value matches the real API response. The two-row segment export matches API counts, percentages, monetary totals and contributions.

The downloadable representation deliberately differs for risky text; JSON/explorer identifiers and ML memberships remain unchanged. Native Excel/LibreOffice automation was not performed. A visible prefix avoids reliance on apostrophe/tab importer semantics, but CSV cannot promise exact fidelity across all spreadsheet transformations. Use API JSON for exact identifiers; import ordinary leading-zero ID columns as text. See EXPORT_SECURITY.md and [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).

## 7. XLSX hardening and dependency applicability

Installed openpyxl 3.1.5 and pandas 3.0.6 are retained. [openpyxl security guidance](https://openpyxl.readthedocs.io/en/stable/index.html) recommends defusedxml for XML expansion protection. The compatible official defusedxml 0.7.1 wheel was installed in the isolated validation environment and declared as a dependency. Startup verifies the active openpyxl parser identity, so merely installing an unused package cannot silently pass. Python was restarted before actual HTTP tests.

Existing extension/content checks, 64 MiB file and 65 MiB request budgets, 512 MiB declared expanded archive budget, 1,000 members, encryption rejection, multipart field limits and cleanup remain. Duplicate ZIP member names now fail safely. Focused tests demonstrate harmless entity declarations rejected across four parts, fail-closed startup, duplicate rejection, correct safe errors, closed spooled upload handles and recovered capacity for legitimate uploads. These are bounded fixtures, not dangerous stress payloads.

Fresh OSV exact-version checks covered all 29 pinned runtime packages: no matching advisory IDs returned. npm audit returned zero findings for the lockfile. These snapshots do not prove absence of undisclosed vulnerabilities. pip 25.0.1's six unique GHSA records (12 alias records) were installer findings, not FastAPI runtime vulnerabilities; one tar fallback issue is mitigated by the validated Python 3.12 implementation, while other installer issues required a patch. The isolated pip tool was upgraded to [official 26.2.1](https://pypi.org/project/pip/26.2.1/) and its post-patch OSV query returned no advisory IDs. No irrelevant ML/runtime upgrade was made. `pip check` passes.

## 8. Portable configuration

Existing frontend origin resolution supports an empty same-origin `/api` base or an explicit HTTPS API origin. No production localhost origin is injected into the default build. `API_PROXY_TARGET` is limited to local dev/preview server proxying. Backend CORS accepts exact public HTTPS origins and loopback HTTP, rejecting wildcards, credentials, paths, malformed hosts/ports and non-local HTTP. Explicit allowed production preflight passes; disallowed origin is rejected without an allow-origin header; credentials are not allowed.

Safe env examples document public Vite values and backend process environment loading. DEPLOYMENT_READINESS.md provides one-worker Uvicorn commands, explicit host/port binding, health command, numerical thread limits, same-origin/separate-origin examples and SPA/API fallback exclusions. Production build and development proxies both return real backend health JSON. A real provider/HTTPS ingress has not been configured or tested.

## 9. Resource limitations and safety

Historical Phase 5A measurements remain approximately 88.28 s, 482 MiB sampled backend memory and 1.71 MB response; these are not universal guarantees. This phase's browser example completed in **94.35 s end to end**, not a controlled comparative benchmark; memory/response size were not remeasured. During that run, HTTP health returned 200 in **0.279 s** (client request measurement), and a competing analysis returned 503 `analysis_busy` with Retry-After 1.

The browser retains processing feedback, disabled controls, timeout/cancel messaging and existing results navigation. Browser timeout/cancellation does not stop server CPU work. Defaults admit one analysis per process; extra workers multiply memory/concurrency. Workbook expanded-size limits do not bound DataFrame object memory. A 512 MiB host lacks useful headroom above the observed run. Evaluate at least 1 GiB, preferably 2 GiB per worker, and measure the selected host/max allowed input before approving capacity.

Public ingress needs aligned body budgets, slow-upload/read time limits, request-rate/admission controls and private temporary storage/disk quotas. No speculative thread timeout, auth framework, queue/database or ML rewrite was introduced.

## 10. Dataset attribution, privacy and deployment

The original 23,715,344-byte workbook exactly matches UCI's official archive member. Both SHA-256 hashes are `43465a06f2ccf7c8b5bd2892bc7defb52f97487934fe93b16ae4c3936424676d`. [UCI Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail) explicitly permits redistribution under CC BY 4.0 with attribution. DATASET_NOTICE.md records Chen (2015), DOI 10.24432/C5BW33, source/license links and an unchanged-workbook/derived-analysis notice.

Pseudonymous customer numbers and historical transactions are not a guarantee of anonymity. Keep private uploads/exports out of Git and static serving. Provision the example read-only outside the frontend static directory; prefer a separately downloaded hash-verified asset to repeated image bundling. Its absence produces the existing example-unavailable response. Attribution must accompany public distribution/demo, and public display/provisioning remains a user review decision. Dataset permission is verified; Segmentra's source-code license is not invented. No dataset publication occurred.

## 11. Frontend verification

- Entire Vitest suite: **120 passed, 12 test files**, approximately 13.58 s. Baseline 98 plus 22 CSV boundary cases.
- TypeScript: `tsc --noEmit` passed as part of build.
- `npm audit --json`: **0 vulnerabilities**.
- Browser: Home to Analyze; real example results in Segments/Insights; actual CSV upload, original risky-ID display and three CSV downloads; XLSX upload with log preprocessing; result route navigation.

## 12. Python verification

- Reproduced all **8** previous failures before fixing them; every cause chain inspected.
- Focused original failing cases after fix: **8 passed**, 15 other cases deselected.
- Entire suite after fix: **176 passed**, approximately 12.95 s. Baseline 153 plus 23 release security tests.
- One existing Starlette/httpx TestClient deprecation warning remains; no failures. No unrelated test-client migration.
- `pip check`: no broken requirements.

## 13. Production build and actual workflows

Vite production build passed: 67 modules; CSS 99.65 kB (20.37 kB gzip); JS 378.32 kB (117.13 kB gzip); HTML 0.67 kB. Node 24.19.0, Python 3.12.14.

| Executed workflow | Observed result |
| --- | --- |
| Example, raw scaling, selected K=4, candidates 2..4 | 4,338 customers, 392,692 retained transactions, total 8,887,208.89, recommended K=2, selected silhouette 0.6080; clusters 3,054/1,067/13/204. |
| Example Insights | 4,338 PCA points; variance 55.47%/30.25%; inertia 4,096.3, real candidate table and profiles. |
| CSV API and browser, six synthetic customers, raw scaling K=2 | HTTP 200; six exact identifiers retained, total 279; browser silhouette 0.6913, real downloads verified. |
| XLSX API, same six customers, raw scaling K=2 | HTTP 200; all six original identifiers preserved. |
| XLSX built frontend, log scaling K=2 | Completed in 0.09 s; six customers/transactions, total 279, silhouette 0.6824. |
| Invalid binary workbook | HTTP 400 `file_type_mismatch`. |
| External-entity workbook over real HTTP | HTTP 400 `invalid_workbook`, no sensitive path/trace disclosure. |
| Concurrent example admission | HTTP 503 `analysis_busy`, Retry-After 1; health stays 200. |
| Development/built proxy health | Both 5173 and 4173 forward to real FastAPI health. |
| Built preview refresh | Home, Analyze, Segments, Insights, Methodology, About all render after refresh. |

Result state remains the original in-memory React context: navigation preserves it, configuration changes clear it, and full browser refresh resets it. Refresh tests therefore validate route fallback and the expected empty state, not newly invented persistent storage. Chosen-host deep links remain untested.

Local-only proof artifacts include example/built-XLSX screenshots, decoded-export evidence, live upload/busy JSON, production-route refresh evidence, provenance hashes, scoped staging/scope hashes and advisory snapshots. They are deliberately not staged with source.

## 14. Remaining release gates

- Hosting provider, OS and ingress not selected: fresh target installation, memory/disk/CPU capacity, HTTPS, rate/read/body policies and actual proxy timeouts need staging verification.
- Public unauthenticated computation needs ingress abuse controls; CORS is insufficient.
- Native spreadsheet import validation beyond decoded CSV threat checks was not performed; the visible-marker policy and fidelity limits are explicit.
- Decide source-code license and publication contents, preserve attribution/font notices, review inherited dataset history and run the selected secrets scanner before push.
- Existing Starlette TestClient deprecation warning is a future test-tool migration, not a demonstrated runtime failure.

## 15. Exact next actions before push and hosting

1. Review STAGING_MANIFEST.md and staged diff; choose repository visibility/source-code license and retain dataset/font notices. Historical documentation presentation is a separate future phase.
2. Run the publication secret scanner and create the reviewed local Git commit. Do not push until separately authorized.
3. Select the deployment host/origin arrangement; reproduce pinned dependency installation, full tests and build on its OS with a patched installer.
4. Provision HTTPS, SPA fallback excluding API/assets, explicit CORS/API origin, one worker, memory headroom, body/rate/read time limits and private temp storage/disk quota.
5. Decide the UCI example provisioning/display policy; retain citation/license/change notices and verify its hash.
6. Stage-test example/CSV/XLSX/exports/prohibited XML, concurrency/health, request limits, disconnects and all deep-link refreshes through that ingress.
7. Request deployment/push authorization only after those concrete checks are reviewable. Neither action is performed in Phase 5B.

Checksums confirm all authoritative `segmentation` modules, six route page components, styles, original Python entrypoints and workbook remain unchanged. Approved visual design, ML algorithms and API response structures are preserved.

**READY WITH EXPLICIT CONDITIONS.** Phase 5B remediation is complete; hosting/publication conditions remain documented gates.
