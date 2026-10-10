# Segmentra security safeguards

Customer exports (filtered Segments and all-customer Insights) and segment profile exports share `frontend/src/utils/csv.ts`. Formula-like **string** values get a visible `[text] ` prefix before standard CSV quoting/quote doubling. Detection checks `= + - @` after a detection-only NFKC normalization and removal of leading Unicode whitespace, control/format characters and quotes. The original string is retained after the marker. Numeric API values, including negative PCA coordinates, are unchanged.

Quoting alone does not prevent spreadsheet formula interpretation. The visible ASCII marker puts `[` at the decoded cell start and survives ordinary trimming and CSV parse/reserialization without relying on application-specific apostrophe/tab behavior. This changes the downloadable representation of risky IDs and other text. JSON and the customer explorer retain authoritative identifiers; never blindly remove markers from arbitrary data. Leading-zero IDs still require importing the column as text.

Tests decode real CSV with PapaParse, check field boundaries and the effective cell start, and serialize/reparse the decoded cells. They cover 19 threat inputs, every exported customer text field, profile text, and unchanged negative numeric coordinates. Native Excel/LibreOffice automation was not performed. CSV cannot guarantee fidelity and safety across every spreadsheet import/transformation; explicitly converting a protected cell back to a formula defeats this policy. Use API JSON for exact machine-readable identifiers.

Policy reference: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).

## XLSX and HTTP ingestion

`backend/services/analysis_service.py` verifies active openpyxl/defusedxml parsing and fails closed if protection is inactive. The declared dependency is `defusedxml==0.7.1`. Prohibited entity declarations/external references return HTTP 400 `invalid_workbook`, stage `ingestion`, in the existing safe error envelope. Classification walks explicit exception causes and checks actual `DefusedXmlException` types; unrelated validation errors retain their own handling.

File/content checks, encrypted/duplicate ZIP member rejection, declared expanded-size/member budgets, bounded streaming multipart requests and upload-handle cleanup remain enabled. Admission capacity is released after success or failure. See [API limits and error contract](API.md) for exact budgets/statuses. Budget checks do not bound all object memory or computation time.

API requests accept an upload or the bundled example, never an arbitrary client filesystem path. Unexpected failures return safe messages; adapter logs contain correlation ID/type/function rather than raw customer records or stack traces. Explicit CORS allows configured HTTPS origins and loopback HTTP, without wildcard credentials. CORS is not authentication or abuse prevention. There are no accounts or authentication controls; public compute needs the [hosting safeguards](DEPLOYMENT.md).

## Verification and privacy

`tests/test_release_security.py` covers prohibited XML across workbook parts, fail-closed activation, duplicate archives, safe errors, valid-upload recovery, cleanup and CORS. `frontend/src/test/csv-security.test.ts` covers spreadsheet-safe exports. Run commands are in the [README](../../README.md#testing); completed runs are historical evidence unless explicitly rerun.

Keep uploads, exports, dotenv values and local review archives out of Git and static hosting. Browser results are memory-only; refresh clears them. Temporary upload spooling is not persistent result storage. Public UCI attribution and privacy considerations are documented in the [dataset notice](DATASET.md).
