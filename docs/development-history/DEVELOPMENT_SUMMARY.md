# Segmentra development history

This is a concise record of completed development, not a promise that historical test counts always pass. Current checks are recorded separately in cleanup/release verification reports.

| Milestone | Delivered and recorded verification |
| --- | --- |
| Original project | Streamlit/batch RFM and KMeans analysis, preserved at the original baseline commit `58d6b6c` |
| Phase 1 | Independent ingestion/cleaning/RFM/preprocessing/clustering/PCA package; 91 Python tests; full UCI reconciliation |
| Phase 2A | FastAPI contracts, bounded uploads, threaded processing, safe errors and admission; combined Python suite reached 153 |
| Phase 2B | React routing, typed API integration, shared state, explorer/charts/exports; 55 frontend and 153 Python tests |
| Phases 3B/4A/4B | Approved futuristic Home integrated into production React; Analyze and remaining premium pages implemented while retaining the real analytical workflow |
| Phase 5A | Audit identified XML hardening, spreadsheet export, source tracking and hosting/resource gaps; 98 frontend tests after API-origin support |
| Phase 5B | Spreadsheet-safe CSV exports, active defusedxml, cause-chain XML error classification, explicit HTTPS CORS, runtime snapshot and attribution; 120 frontend / 176 Python tests |
| Phase 5C | Simpler copy and native technical disclosures; 124 frontend tests; Python was not rerun in that phase |
| Phase 5D | Shared readable typography, stronger existing Home colors, current screenshots and README; 124 frontend / 176 Python tests, TypeScript and build passed |

Phase 5B reproduced eight XML cases returning the wrong error code despite successful XML rejection. openpyxl wrapped `EntitiesForbidden` in ValueError, then ingestion wrapped it again. The service now walks explicit causes for an actual `DefusedXmlException`, returning HTTP 400 `invalid_workbook` without weakening tests.

Recorded example reconciliation: 541,909 input transactions → 392,692 retained transactions → 4,338 customers, purchase value 8,887,208.894. Raw-scaled K=4 yielded silhouette approximately 0.6080; recommendation K=2 remained separate. These are historical dataset results, not hardcoded application output.

Phase 5A measured roughly 88.28 seconds and 482 MiB sampled resident memory for one example run. Phase 5D observed 121.46 seconds end-to-end under its local conditions, without remeasuring memory. These are not benchmarks or capacity bounds; [deployment requirements](../technical/DEPLOYMENT.md) retains the resource limitations.

Phase 5D published commit `3062cdacd6b1f4682fc0abe66eb46c2b10867266` to the existing `origin/main` after reviewed staging. No application deployment occurred. This subsequent organization task performs no commit or push.

## Historical originals and local evidence

Original phase reports, the historical staging manifest, old validation JSON/screenshots, the old dependency snapshot and generated directory listing are preserved byte-for-byte under the ignored `local-archive/` directory beside this summary. They may contain local paths, old findings and outdated commands; they are local evidence, not current technical documentation or publication assets. A local inventory maps every move, and a pre-cleanup ZIP preserves original paths. Git history also retains previously committed reports. External earlier review/checkpoint folders remain untouched.

Current public screenshots remain in `docs/screenshots/`. Required OpenAPI snapshots, test fixtures and lockfiles are source inputs, not disposable JSON artifacts. Legacy scripts and environment folders are retained. See [architecture](../technical/ARCHITECTURE.md) for legacy disposition and [README](../../README.md) for current setup.
