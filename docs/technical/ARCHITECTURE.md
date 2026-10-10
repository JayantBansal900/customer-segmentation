# Segmentra architecture

The application is a React/TypeScript SPA, a FastAPI HTTP adapter and an independent Python segmentation package. There is no database, account system, queue or persisted analysis service.

`React configuration → multipart POST /api/analyze → FastAPI admission/validation → segmentation.run_pipeline → validated JSON → React context → segment explorer/charts/CSV`

| Responsibility | Actual source |
| --- | --- |
| Routes and shared navigation | `frontend/src/app`; six pages under `frontend/src/pages` |
| Analysis state and request lifecycle | `frontend/src/context`; configuration/file/result/status held in memory |
| Typed API client and contract checks | `frontend/src/services`, OpenAPI snapshot and generated declarations in `frontend/src/types` |
| Home illustration and charts | Custom WebGL with SVG fallback; Canvas PCA, SVG candidate chart, HTML bars/distributions |
| HTTP application and validation | `backend/main.py`, routes, schemas, middleware, configuration and analysis service |
| Numerical pipeline | `segmentation/`; [ML pipeline](ML_PIPELINE.md) |
| Regression tests | `tests/` and `frontend/src/test`, plus colocated Home tests |

Analysis starts on submission, never automatically on route mount. Dataset/model changes invalidate old results. Navigation preserves the context result; refresh clears it. Request-generation guards prevent stale completion, and controls prevent duplicate submission. Browser timeout/cancel stops waiting, not server computation. The explorer paginates 25 displayed rows; the full API response remains in browser memory.

FastAPI admits one analysis per process by default, including multipart parsing. Validation, ML and response serialization run in a worker thread; health remains asynchronous. Extra requests receive 503 rather than a queue. Multiple ASGI workers multiply memory and capacity. [API](API.md), [security](SECURITY.md) and [deployment](DEPLOYMENT.md) own those detailed contracts.

Vite's development/preview proxy is local tooling. Production requires a real static server and API routing with SPA fallback. Entry points remain `frontend/src/main.tsx` and `backend.main:app`.

## Legacy material

Root `app.py` is the original Streamlit dashboard; `main.py` is the original batch analysis script. Neither is imported by the modern frontend/backend/ML packages. Both read the root workbook relative to their working directory, and `main.py` writes `cluster_boxplots.png` and CSV outputs. Their root locations and `.streamlit/config.toml` are preserved to avoid changing legacy behavior. The existing plot is historical output. These files are optional historical material in a future publication; relocation should be a separate explicit decision with legacy invocation/documentation review.

Original package names and internal `segmentiq` identifiers remain intentional; visible branding is Segmentra. Installation and local commands live in the [README](../../README.md).
